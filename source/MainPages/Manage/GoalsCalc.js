  // Função para formatar moeda
  export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Função para calcular progresso da meta
  export const calculateGoalProgress = (goal, type = 'time', availableMoney = 0) => {
    const creationDate = new Date(goal.created_at);
    const deadlineDate = new Date(goal.deadline);
    const today = new Date();
    const totalDays = Math.max(1, Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24)));
    
    if (type === 'time') {
      const daysPassed = Math.floor((today - creationDate) / (1000 * 60 * 60 * 24));
      const percentagePerDay = 100 / totalDays;
      let progress = daysPassed * percentagePerDay;
      if (today >= deadlineDate) return 100;
      if (daysPassed < 0) return 0;
      return Math.min(progress, 99.99);
    } else if (type === 'financial') {
      const daysPassed = Math.max(0, Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)));
      const prop = totalDays / 30;
      const propPassed = daysPassed / 30;
      const periodAvailable = availableMoney * prop;
      const periodPassedAvailable = availableMoney * propPassed;
      const accumulated = (goal.goal_saving_minimum / 100) * periodPassedAvailable;
      return Math.min((accumulated / goal.amount) * 100, 100);
    }
    return 0;
  };

  // Função para calcular o status da meta
  export const calculateGoalStatus = async (goal, supabase) => {
    try {
      const today = new Date();
      const deadlineDate = new Date(goal.deadline);
      const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysToDeadline === 0) {
        return {
          status: 4,
          message: 'Hoje é o dia da meta! Verifique se já atingiu o valor necessário.'
        };
      }
      if (daysToDeadline < 0) {
        return {
          status: 3,
          message: 'Esta meta já expirou e não foi alcançada. Altere a data de entrega para continuar.'
        };
      }

      // Obter dados financeiros para simulação de cenários
      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select('goal_saving_minimum')
        .eq('user_id', goal.user_id);
      
      if (goalsError) throw goalsError;
      
      const totalSavingsPercentage = userGoals.reduce((sum, g) => {
        if (g.id === goal.id) return sum;
        return sum + (g.goal_saving_minimum || 0);
      }, 0);
      
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('*, frequencies(days)')
        .eq('user_id', goal.user_id);
      
      if (incomeError) throw incomeError;
      
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, frequencies(days)')
        .eq('user_id', goal.user_id);
        
      if (expensesError) throw expensesError;

      // Calcular renda e despesas
      const totalIncome = incomeData.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);
      
      const totalExpenses = expensesData.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);
      
      const availableMoney = totalIncome - totalExpenses;
      
      // Simular cenários
      const scenarios = await simulateGoalScenarios(
        goal, 
        expensesData, 
        availableMoney, 
        daysToDeadline
      );
      
      // Determinar status com base nos cenários
      if (scenarios.baseScenario.possible) {
        return {
          status: 1,
          message: 'Esta meta é alcançável com a poupança atual.',
          scenarios
        };
      } else if (scenarios.percentageScenario.possible) {
        return {
          status: 2,
          message: `Meta possível aumentando para ${scenarios.percentageScenario.newPercentage.toFixed(2)}% da poupança.`,
          scenarios
        };
      } else if (scenarios.expenseScenarios.some(s => s.possible)) {
        const bestScenario = scenarios.expenseScenarios.find(s => s.possible);
        return {
          status: 2,
          message: `Meta possível removendo ${bestScenario.removedExpenses} despesa(s) de prioridade ${bestScenario.priority}.`,
          scenarios
        };
      } else if (scenarios.combinedScenarios.some(s => s.possible)) {
        const bestCombined = scenarios.combinedScenarios.find(s => s.possible);
        return {
          status: 2,
          message: `Meta possível com ${bestCombined.newPercentage.toFixed(2)}% e removendo despesas de prioridade ${bestCombined.priority}.`,
          scenarios
        };
      } else {
        return {
          status: 3,
          message: 'Esta meta não é alcançável mesmo com ajustes na poupança e despesas.',
          scenarios
        };
      }
    } catch (error) {
      console.error('Error calculating goal status:', error);
      return {
        status: 3,
        message: 'Erro ao calcular o status da meta.'
      };
    }
  };

  // Nova função para simular cenários de metas
  export const simulateGoalScenarios = async (goal, expenses, availableMoney, daysToDeadline) => {
    try {
      // Organizar despesas por prioridade (assumindo que existe um campo 'priority')
      // Se não existir, você pode modificar essa lógica
      const expensesByPriority = {};
      for (let i = 1; i <= 5; i++) {
        // Filtra despesas por prioridade (1-5)
        expensesByPriority[i] = expenses.filter(e => e.priority === i || (!e.priority && i === 3));
      }
      
      // Dados básicos
      const monthsToDeadline = daysToDeadline / 30;
      const currentSaving = (goal.goal_saving_minimum / 100) * availableMoney;
      const totalCurrentSaving = currentSaving * monthsToDeadline;
      const goalAmount = goal.amount || 0;
      
      // Cenário 1: Verificar se é possível com a configuração atual
      const baseScenario = {
        type: 'current',
        possible: totalCurrentSaving >= goalAmount,
        monthlyAmount: currentSaving,
        totalSaved: totalCurrentSaving,
        needed: goalAmount,
        remaining: totalCurrentSaving - goalAmount,
        currentPercentage: goal.goal_saving_minimum
      };
      
      // Cenário 2: Ajuste apenas de porcentagem
      let neededSavingPerMonth = goalAmount / monthsToDeadline;
      let neededPercentage = (neededSavingPerMonth / availableMoney) * 100;
      
      const percentageScenario = {
        type: 'percentage',
        possible: neededPercentage <= 100 && neededPercentage > 0,
        currentPercentage: goal.goal_saving_minimum,
        newPercentage: neededPercentage,
        monthlyChange: neededSavingPerMonth - currentSaving,
        totalChange: goalAmount - totalCurrentSaving
      };
      
      // Cenário 3: Remoção de despesas por prioridade
      const expenseScenarios = [];
      let cumulativeSavings = 0;
      
      for (let priority = 1; priority <= 5; priority++) {
        const priorityExpenses = expensesByPriority[priority] || [];
        
        // Calcular quanto seria economizado removendo essas despesas
        const monthlySavings = priorityExpenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30 / days);
        }, 0);
        
        cumulativeSavings += monthlySavings;
        const newAvailableMoney = availableMoney + cumulativeSavings;
        const currentMonthlyWithNewAvailable = (goal.goal_saving_minimum / 100) * newAvailableMoney;
        const newTotalSaved = currentMonthlyWithNewAvailable * monthsToDeadline;
        
        expenseScenarios.push({
          priority,
          removedExpenses: priorityExpenses.length,
          monthlySavings,
          cumulativeSavings,
          newAvailableMoney,
          newMonthlySaving: currentMonthlyWithNewAvailable,
          newTotalSaved,
          possible: newTotalSaved >= goalAmount
        });
      }
      
      // Cenário 4: Combinação de ajuste de porcentagem e remoção de despesas
      const combinedScenarios = [];
      
      for (let priority = 1; priority <= 5; priority++) {
        const scenario = expenseScenarios[priority - 1];
        
        if (scenario && scenario.newAvailableMoney > 0) {
          const newNeededPerMonth = goalAmount / monthsToDeadline;
          const newNeededPercentage = (newNeededPerMonth / scenario.newAvailableMoney) * 100;
          
          combinedScenarios.push({
            priority,
            newPercentage: newNeededPercentage,
            newMonthlyAmount: newNeededPerMonth,
            possible: newNeededPercentage <= 100 && newNeededPercentage > 0,
            removedExpenses: scenario.removedExpenses,
            monthlySavings: scenario.monthlySavings
          });
        }
      }
      
      return {
        baseScenario,
        percentageScenario,
        expenseScenarios,
        combinedScenarios,
        overallPossible: baseScenario.possible || 
                         percentageScenario.possible || 
                         expenseScenarios.some(s => s.possible) || 
                         combinedScenarios.some(s => s.possible)
      };
    } catch (error) {
      console.error('Error simulating goal scenarios:', error);
      return {
        baseScenario: { possible: false },
        percentageScenario: { possible: false },
        expenseScenarios: [],
        combinedScenarios: [],
        overallPossible: false
      };
    }
  };

  // Função para calcular valores alocados
  export const calculateAllocationValue = (goals, availableMoney, currentGoalId = null, newPercentage = 0) => {
    if (!goals || !Array.isArray(goals)) {
      return {
        totalPercentage: 0,
        totalFixedValue: 0,
        isValid: true,
        message: 'Nenhuma meta encontrada'
      };
    }

    // Validação do novo valor
    const roundedNewPercentage = newPercentage ? parseFloat(Number(newPercentage).toFixed(2)) : 0;
    if (roundedNewPercentage < 0 || roundedNewPercentage > 100) {
      return {
        totalPercentage: 0,
        totalFixedValue: 0,
        isValid: false,
        message: 'Porcentagem inválida. Deve estar entre 0 e 100.'
      };
    }

    const allocation = goals.reduce((acc, goal) => {
      // Ignora a meta atual se estiver editando
      if (currentGoalId && String(goal.id) === String(currentGoalId)) {
        return acc;
      }

      const percentage = goal.goal_saving_minimum || 0;
      const fixedValue = (percentage / 100) * availableMoney;

      return {
        totalPercentage: acc.totalPercentage + percentage,
        totalFixedValue: acc.totalFixedValue + fixedValue
      };
    }, { totalPercentage: 0, totalFixedValue: 0 });

    // Arredonda para 2 casas decimais
    allocation.totalPercentage = Number(allocation.totalPercentage.toFixed(2));
    allocation.totalFixedValue = Number(allocation.totalFixedValue.toFixed(2));

    // Cálculo do novo total incluindo a nova porcentagem
    const newTotalPercentage = allocation.totalPercentage + roundedNewPercentage;
    const newTotalFixedValue = (newTotalPercentage / 100) * availableMoney;

    // Validações
    const isValid = newTotalPercentage <= 100;
    const remainingPercentage = 100 - allocation.totalPercentage;
    const remainingFixedValue = availableMoney - allocation.totalFixedValue;

    return {
      ...allocation,
      newTotalPercentage: Number(newTotalPercentage.toFixed(2)),
      newTotalFixedValue: Number(newTotalFixedValue.toFixed(2)),
      isValid,
      remainingPercentage,
      remainingFixedValue,
      message: isValid 
        ? `Alocação atual: ${allocation.totalPercentage}% (${formatCurrency(allocation.totalFixedValue)})`
        : `Alocação excede 100% (${newTotalPercentage}%)`,
      validation: {
        isValid,
        currentPercentage: allocation.totalPercentage,
        newPercentage: roundedNewPercentage,
        newTotalPercentage,
        availableMoney,
        currentFixedValue: allocation.totalFixedValue,
        newFixedValue: (roundedNewPercentage / 100) * availableMoney
      }
    };
  };


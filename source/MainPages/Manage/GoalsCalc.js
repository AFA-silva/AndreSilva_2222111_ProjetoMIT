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
        possible: neededPercentage <= 100 && neededPercentage > 0 && availableMoney > 0,
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
        
        // Só considere se houver despesas nesta prioridade
        if (priorityExpenses.length === 0) continue;
        
        // Calcular quanto seria economizado removendo essas despesas
        const monthlySavings = priorityExpenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30 / days);
        }, 0);
        
        // Se não há economia mensal significativa, pule
        if (monthlySavings <= 0) continue;
        
        // Capturar os nomes e valores das despesas para exibição
        const expenseDetails = priorityExpenses.map(expense => ({
          name: expense.name || expense.description || `Despesa ${expense.id}`,
          amount: expense.amount,
          frequency: expense.frequencies?.days || 30
        }));
        
        const newAvailableMoney = availableMoney + monthlySavings;
        const currentMonthlyWithNewAvailable = (goal.goal_saving_minimum / 100) * newAvailableMoney;
        const newTotalSaved = currentMonthlyWithNewAvailable * monthsToDeadline;
        
        // Verificar se este cenário sozinho é realmente suficiente para atingir a meta
        const scenarioPossible = newTotalSaved >= goalAmount;
        
        expenseScenarios.push({
          priority,
          removedExpenses: priorityExpenses.length,
          monthlySavings,
          newAvailableMoney,
          newMonthlySaving: currentMonthlyWithNewAvailable,
          newTotalSaved,
          possible: scenarioPossible,
          expenseDetails // Adicionando detalhes das despesas
        });
      }
      
      // Cenário 4: Combinação de ajuste de porcentagem e remoção de despesas
      const combinedScenarios = [];
      
      for (let priority = 1; priority <= 5; priority++) {
        // Encontrar o cenário de remoção de despesas para esta prioridade
        const expenseScenario = expenseScenarios.find(s => s.priority === priority);
        
        if (expenseScenario && expenseScenario.newAvailableMoney > 0) {
          const newNeededPerMonth = goalAmount / monthsToDeadline;
          const newNeededPercentage = (newNeededPerMonth / expenseScenario.newAvailableMoney) * 100;
          
          // Verificar se a combinação é realmente viável
          const combinedPossible = newNeededPercentage <= 100 && newNeededPercentage > 0;
          
          combinedScenarios.push({
            priority,
            newPercentage: newNeededPercentage,
            newMonthlyAmount: newNeededPerMonth,
            possible: combinedPossible,
            removedExpenses: expenseScenario.removedExpenses,
            monthlySavings: expenseScenario.monthlySavings,
            expenseDetails: expenseScenario.expenseDetails
          });
        }
      }
      
      // Verificar cenário adicional: remover despesas em múltiplas prioridades
      const multiPriorityScenarios = [];
      const validPriorityCombinations = [];
      
      // Gerar todas as combinações possíveis de prioridades
      // Começando com combinações pequenas (apenas 2 prioridades)
      const priorityValues = Object.keys(expensesByPriority)
        .filter(p => expensesByPriority[p].length > 0)
        .map(p => parseInt(p));
      
      // Função para gerar combinações
      const generateCombinations = (arr, size) => {
        const result = [];
        const f = (prefix, arr, n) => {
          for (let i = 0; i < arr.length; i++) {
            if (prefix.length === n - 1) {
              result.push([...prefix, arr[i]]);
            } else {
              f([...prefix, arr[i]], arr.slice(i + 1), n);
            }
          }
        };
        f([], arr, size);
        return result;
      };
      
      // Gerar combinações de tamanho 2 a N (todas as prioridades)
      const allCombinations = [];
      for (let size = 2; size <= priorityValues.length; size++) {
        const combinations = generateCombinations(priorityValues, size);
        allCombinations.push(...combinations);
      }
      
      // Avaliar cada combinação
      for (const combination of allCombinations) {
        combination.sort((a, b) => a - b); // Ordenar prioridades
        let totalSavings = 0;
        const combinedExpenseDetails = [];
        
        for (const priority of combination) {
          const priorityExpenses = expensesByPriority[priority] || [];
          
          // Calcular total economizado
          for (const expense of priorityExpenses) {
            const days = expense.frequencies?.days || 30;
            const monthlySaving = (expense.amount * 30) / days;
            totalSavings += monthlySaving;
            
            combinedExpenseDetails.push({
              name: expense.name || expense.description || `Despesa ${expense.id}`,
              amount: expense.amount,
              priority,
              frequency: expense.frequencies?.days || 30
            });
          }
        }
        
        // Verificar viabilidade
        const newAvailableMoney = availableMoney + totalSavings;
        const currentMonthlyWithNewAvailable = (goal.goal_saving_minimum / 100) * newAvailableMoney;
        const newTotalSaved = currentMonthlyWithNewAvailable * monthsToDeadline;
        const scenarioPossible = newTotalSaved >= goalAmount;
        
        // Só adicione se houver economias significativas
        if (totalSavings > 0) {
          multiPriorityScenarios.push({
            priorities: combination,
            monthlySavings: totalSavings,
            newMonthlySaving: currentMonthlyWithNewAvailable,
            newTotalSaved,
            possible: scenarioPossible,
            expenseDetails: combinedExpenseDetails
          });
          
          if (scenarioPossible) {
            validPriorityCombinations.push(combination);
          }
        }
      }
      
      // Encontrar a combinação mais eficiente entre todas viáveis
      let mostEfficientScenario = null;
      let efficientScore = Infinity; // Menor é melhor
      
      // Verificar cenários de ajuste de percentual
      if (percentageScenario.possible) {
        const score = percentageScenario.newPercentage;
        if (score < efficientScore) {
          efficientScore = score;
          mostEfficientScenario = {
            type: 'percentage',
            newPercentage: percentageScenario.newPercentage,
            possible: true,
            message: `Ajustar poupança para ${percentageScenario.newPercentage.toFixed(2)}% é suficiente.`
          };
        }
      }
      
      // Verificar cenários de despesa única
      for (const scenario of expenseScenarios) {
        if (scenario.possible) {
          // Pontuação baseada na prioridade (menor é melhor)
          const score = scenario.priority;
          if (score < efficientScore) {
            efficientScore = score;
            
            // Preparar descrição detalhada das despesas
            const expenseNamesText = scenario.expenseDetails && scenario.expenseDetails.length > 0
              ? scenario.expenseDetails.map(e => e.name).join(", ")
              : `${scenario.removedExpenses} despesa(s)`;
              
            mostEfficientScenario = {
              type: 'expense',
              priority: scenario.priority,
              possible: true,
              monthlySavings: scenario.monthlySavings,
              expenseDetails: scenario.expenseDetails,
              message: `Remover despesas de prioridade ${scenario.priority} (${expenseNamesText}) é suficiente.`
            };
          }
        }
      }
      
      // Verificar cenários multi-prioridade
      for (const scenario of multiPriorityScenarios) {
        if (scenario.possible) {
          // Pontuação baseada na média das prioridades (menor é melhor)
          const avgPriority = scenario.priorities.reduce((sum, p) => sum + p, 0) / scenario.priorities.length;
          if (avgPriority < efficientScore) {
            efficientScore = avgPriority;
            
            // Agrupar despesas por prioridade
            const expensesByPriority = {};
            scenario.expenseDetails.forEach(expense => {
              if (!expensesByPriority[expense.priority]) {
                expensesByPriority[expense.priority] = [];
              }
              expensesByPriority[expense.priority].push(expense);
            });
            
            // Criar uma mensagem mais detalhada
            const detailedMessage = Object.keys(expensesByPriority)
              .map(priority => {
                const total = expensesByPriority[priority].reduce((sum, e) => sum + e.amount, 0);
                return `Prioridade ${priority}: ${formatCurrency(total)}`;
              })
              .join(', ');
            
            mostEfficientScenario = {
              type: 'multiPriority',
              priorities: scenario.priorities,
              possible: true,
              monthlySavings: scenario.monthlySavings,
              expenseDetails: scenario.expenseDetails,
              message: `Remover despesas de prioridades ${scenario.priorities.join(', ')} (${detailedMessage}) é suficiente.`
            };
          }
        }
      }
      
      // Verificar cenários combinados
      for (const scenario of combinedScenarios) {
        if (scenario.possible) {
          // Pontuação baseada na prioridade + porcentagem normalizada
          const normalizedPercent = scenario.newPercentage / 100;
          const score = scenario.priority + normalizedPercent;
          if (score < efficientScore) {
            efficientScore = score;
            
            // Preparar descrição detalhada das despesas
            const expenseNamesText = scenario.expenseDetails && scenario.expenseDetails.length > 0
              ? scenario.expenseDetails.map(e => e.name).join(", ")
              : `${scenario.removedExpenses} despesa(s)`;
              
            mostEfficientScenario = {
              type: 'combined',
              priority: scenario.priority,
              newPercentage: scenario.newPercentage,
              possible: true,
              monthlySavings: scenario.monthlySavings,
              expenseDetails: scenario.expenseDetails,
              message: `Ajustar para ${scenario.newPercentage.toFixed(2)}% e remover despesas de prioridade ${scenario.priority} (${expenseNamesText}).`
            };
          }
        }
      }
      
      // Cenário recomendado
      const recommendedScenario = mostEfficientScenario ? [mostEfficientScenario] : [];
      
      return {
        baseScenario,
        percentageScenario,
        expenseScenarios,
        combinedScenarios,
        multiPriorityScenarios,
        finalCombinedScenarios: recommendedScenario,
        recommendedScenario: mostEfficientScenario,
        overallPossible: baseScenario.possible || 
                         percentageScenario.possible || 
                         expenseScenarios.some(s => s.possible) || 
                         combinedScenarios.some(s => s.possible) ||
                         multiPriorityScenarios.some(s => s.possible)
      };
    } catch (error) {
      console.error('Error simulating goal scenarios:', error);
      return {
        baseScenario: { possible: false },
        percentageScenario: { possible: false },
        expenseScenarios: [],
        combinedScenarios: [],
        multiPriorityScenarios: [],
        finalCombinedScenarios: [],
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


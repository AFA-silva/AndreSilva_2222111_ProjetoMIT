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
    const { data: userGoals, error: goalsError } = await supabase
      .from('goals')
      .select('goal_saving_minimum')
      .eq('user_id', goal.user_id);
    if (goalsError) throw goalsError;
    const totalSavingsPercentage = userGoals.reduce((sum, g) => {
      if (g.id === goal.id) return sum;
      return sum + (g.goal_saving_minimum || 0);
    }, 0);
    const { data: financialData, error: financialError } = await supabase
      .from('income')
      .select('*, frequencies(days)')
      .eq('user_id', goal.user_id);
    if (financialError) throw financialError;
    const totalIncome = financialData.reduce((sum, income) => {
      const days = income.frequencies?.days || 30;
      return sum + (income.amount * 30) / days;
    }, 0);
    const monthlySaving = (goal.goal_saving_minimum / 100) * totalIncome;
    const monthsToDeadline = daysToDeadline / 30;
    const totalSaving = monthlySaving * monthsToDeadline;
    if (totalSaving >= goal.amount) {
      return {
        status: 1,
        message: 'Esta meta é alcançável com a poupança atual.'
      };
    } else if (totalSaving >= goal.amount * 0.7) {
      return {
        status: 2,
        message: 'Esta meta pode ser alcançada com pequenos ajustes na poupança.'
      };
    } else {
      return {
        status: 3,
        message: 'Esta meta não é alcançável com a poupança atual.'
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


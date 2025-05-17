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
        message: 'Esta meta deve ser alcançada hoje!'
      };
    }
    if (daysToDeadline < 0) {
      return {
        status: 3,
        message: 'Esta meta já expirou e não foi alcançada.'
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

// Função para calcular a distribuição ótima
export const calculateOptimalDistribution = (goals, availableMoney) => {
  if (!goals || goals.length === 0 || !availableMoney) {
    return {
      distribution: [],
      totalPercentage: 0,
      message: 'Não há metas para distribuir.'
    };
  }
  const sortedGoals = [...goals].sort((a, b) => {
    const deadlineA = new Date(a.deadline);
    const deadlineB = new Date(b.deadline);
    return deadlineA - deadlineB;
  });
  let totalPercentage = 0;
  const distribution = sortedGoals.map(goal => {
    const creationDate = new Date(goal.created_at);
    const deadlineDate = new Date(goal.deadline);
    const today = new Date();
    const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(1, Math.ceil((deadlineDate - creationDate) / (1000 * 60 * 60 * 24)));
    const monthsToDeadline = daysToDeadline / 30;
    const monthlyNeeded = goal.amount / monthsToDeadline;
    const percentageNeeded = (monthlyNeeded / availableMoney) * 100;
    if (daysToDeadline <= 0) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        percentage: 0,
        message: 'Meta expirada ou para hoje'
      };
    }
    if (percentageNeeded > (100 - totalPercentage)) {
      const remainingPercentage = 100 - totalPercentage;
      totalPercentage = 100;
      return {
        goalId: goal.id,
        goalName: goal.name,
        percentage: remainingPercentage,
        message: 'Distribuição parcial devido ao limite de 100%'
      };
    }
    totalPercentage += percentageNeeded;
    return {
      goalId: goal.id,
      goalName: goal.name,
      percentage: percentageNeeded,
      message: 'Distribuição completa'
    };
  });
  return {
    distribution,
    totalPercentage,
    message: totalPercentage >= 100 ? 
      'Distribuição completa atingiu o limite de 100%' : 
      'Distribuição parcial, ainda há espaço para mais metas'
  };
};

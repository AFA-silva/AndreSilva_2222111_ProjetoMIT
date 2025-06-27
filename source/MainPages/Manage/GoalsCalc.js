import { formatCurrency as formatCurrencyUtil } from '../../Utility/FetchCountries';

  // Function to format currency
  export const formatCurrency = (value) => {
    return formatCurrencyUtil(value);
  };

  // Function to calculate goal progress
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
      // Simplified financial calculation, based on daily savings
      const daysPassed = Math.max(0, Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)));
      
      // Monthly contribution based on percentage
      const monthlyContribution = (goal.goal_saving_minimum / 100) * availableMoney;
      
      // Daily contribution (simply dividing by 30 days)
      const dailyContribution = monthlyContribution / 30;
      
      // Total accumulated to date
      const accumulatedSavings = dailyContribution * daysPassed;
      
      // Financial progress (percentage of goal already saved)
      const financialProgress = (accumulatedSavings / goal.amount) * 100;
      
      return Math.min(Math.max(0, financialProgress), 100);
    }
    return 0;
  };

  // Function to calculate goal status
  export const calculateGoalStatus = async (goal, supabase) => {
    try {
      const today = new Date();
      const deadlineDate = new Date(goal.deadline);
      const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      
      // Status 4 only on goal day (exactly today)
      if (daysToDeadline === 0) {
        return {
          status: 4,
          message: 'Today is the goal deadline! Check if you\'ve reached the required amount.'
        };
      }
      
      // For expired goals, we still want to show scenarios but mark as expired
      let isExpired = daysToDeadline < 0;

      // Get financial data for scenario simulation
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

      // Calculate income and expenses
      const totalIncome = incomeData.reduce((sum, income) => {
        const days = income.frequencies?.days || 30;
        return sum + (income.amount * 30) / days;
      }, 0);
      
      const totalExpenses = expensesData.reduce((sum, expense) => {
        const days = expense.frequencies?.days || 30;
        return sum + (expense.amount * 30) / days;
      }, 0);
      
      const availableMoney = totalIncome - totalExpenses;
      
      // Simulate scenarios (use positive days for calculation, even if expired)
      const effectiveDays = Math.max(1, daysToDeadline); // Minimum 1 day for calculation
      const scenarios = await simulateGoalScenarios(
        goal, 
        expensesData, 
        availableMoney, 
        effectiveDays
      );
      
      // If expired, always return status 3 but include scenarios
      if (isExpired) {
        return {
          status: 3,
          message: 'This goal has already expired. Review scenarios below to adjust your approach.',
          scenarios
        };
      }
      
      // Determine status based on scenarios for non-expired goals
      if (scenarios.baseScenario.possible) {
        return {
          status: 1, // Green - Achievable
          message: 'This goal is achievable with current savings.',
          scenarios
        };
      } else if (scenarios.recommendedScenario) {
        // Use detailed message from recommended scenario
        let statusMsg = '';
        
        if (scenarios.recommendedScenario.type === 'percentage') {
          statusMsg = `Goal possible by increasing to ${scenarios.recommendedScenario.newPercentage.toFixed(2)}% of savings.`;
        } 
        else if (scenarios.recommendedScenario.type === 'expense') {
          const expenseNames = scenarios.recommendedScenario.expenseDetails 
            ? scenarios.recommendedScenario.expenseDetails.map(e => e.name).join(", ")
            : '';
          statusMsg = `Goal possible by removing expenses: ${expenseNames}.`;
        }
        else if (scenarios.recommendedScenario.type === 'multiPriority') {
          const prioritiesText = scenarios.recommendedScenario.priorities.join(', ');
          const expenseNames = scenarios.recommendedScenario.expenseDetails
            ? scenarios.recommendedScenario.expenseDetails.slice(0, 3).map(e => e.name).join(", ")
            : '';
          statusMsg = `Goal possible by removing priority ${prioritiesText} expenses${expenseNames ? ` (${expenseNames}${scenarios.recommendedScenario.expenseDetails.length > 3 ? '...' : ''})` : ''}.`;
        }
        else if (scenarios.recommendedScenario.type === 'combined') {
          const expenseNames = scenarios.recommendedScenario.expenseDetails
            ? scenarios.recommendedScenario.expenseDetails.slice(0, 2).map(e => e.name).join(", ")
            : '';
          statusMsg = `Goal possible with ${scenarios.recommendedScenario.newPercentage.toFixed(2)}% and removing expenses${expenseNames ? ` (${expenseNames}${scenarios.recommendedScenario.expenseDetails.length > 2 ? '...' : ''})` : ''}.`;
        }
        
        return {
          status: 2, // Yellow - Possible with adjustments
          message: statusMsg,
          scenarios
        };
      } else if (scenarios.percentageScenario.possible) {
        return {
          status: 2, // Yellow - Possible with adjustments
          message: `Goal possible by increasing to ${scenarios.percentageScenario.newPercentage.toFixed(2)}% of savings.`,
          scenarios
        };
      } else if (scenarios.expenseScenarios.some(s => s.possible)) {
        const bestScenario = scenarios.expenseScenarios.find(s => s.possible);
        const expenseNames = bestScenario.expenseDetails 
          ? bestScenario.expenseDetails.map(e => e.name).join(", ")
          : '';
        return {
          status: 2, // Yellow - Possible with adjustments
          message: `Goal possible by removing expenses: ${expenseNames}.`,
          scenarios
        };
      } else if (scenarios.combinedScenarios.some(s => s.possible)) {
        const bestCombined = scenarios.combinedScenarios.find(s => s.possible);
        const expenseNames = bestCombined.expenseDetails
          ? bestCombined.expenseDetails.slice(0, 2).map(e => e.name).join(", ")
          : '';
        return {
          status: 2, // Yellow - Possible with adjustments
          message: `Goal possible with ${bestCombined.newPercentage.toFixed(2)}% and removing expenses${expenseNames ? ` (${expenseNames}${bestCombined.expenseDetails.length > 2 ? '...' : ''})` : ''}.`,
          scenarios
        };
      } else {
        return {
          status: 3, // Red - Not achievable
          message: 'This goal is not achievable even with adjustments to savings and expenses.',
          scenarios
        };
      }
    } catch (error) {
      console.error('Error calculating goal status:', error);
      return {
        status: 3, // Red - Error
        message: 'Error calculating goal status.'
      };
    }
  };

  // New function to simulate goal scenarios
  export const simulateGoalScenarios = async (goal, expenses, availableMoney, daysToDeadline) => {
    try {
      // Organize expenses by priority (assuming a 'priority' field exists)
      // If it doesn't exist, you can modify this logic
      const expensesByPriority = {};
      for (let i = 1; i <= 3; i++) { // Only consider priorities 1-3
        // Filter expenses by priority (1-3)
        expensesByPriority[i] = expenses.filter(e => e.priority === i || (!e.priority && i === 3));
      }
      
      // Basic data
      const monthsToDeadline = daysToDeadline / 30;
      const currentSaving = (goal.goal_saving_minimum / 100) * availableMoney;
      const totalCurrentSaving = currentSaving * monthsToDeadline;
      const goalAmount = goal.amount || 0;
      
      // Scenario 1: Check if possible with current configuration
      const baseScenario = {
        type: 'current',
        possible: totalCurrentSaving >= goalAmount,
        monthlyAmount: currentSaving,
        totalSaved: totalCurrentSaving,
        needed: goalAmount,
        remaining: totalCurrentSaving - goalAmount,
        currentPercentage: goal.goal_saving_minimum
      };
      
      // Scenario 2: Percentage adjustment only
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
      
      // Scenario 3: Expense removal by priority
      const expenseScenarios = [];
      let cumulativeSavings = 0;
      
      for (let priority = 1; priority <= 3; priority++) { // Apenas considerar prioridades 1-3
        const priorityExpenses = expensesByPriority[priority] || [];
        
        // Only consider if there are expenses in this priority
        if (priorityExpenses.length === 0) continue;
        
        // Calculate how much would be saved by removing these expenses
        const monthlySavings = priorityExpenses.reduce((sum, expense) => {
          const days = expense.frequencies?.days || 30;
          return sum + (expense.amount * 30 / days);
        }, 0);
        
        // If there's no significant monthly savings, skip
        if (monthlySavings <= 0) continue;
        
        // Capture expense names and values for display
        const expenseDetails = priorityExpenses.map(expense => ({
          name: expense.name || expense.description || `Expense ${expense.id}`,
          amount: expense.amount,
          frequency: expense.frequencies?.days || 30
        }));
        
        const newAvailableMoney = availableMoney + monthlySavings;
        const currentMonthlyWithNewAvailable = (goal.goal_saving_minimum / 100) * newAvailableMoney;
        const newTotalSaved = currentMonthlyWithNewAvailable * monthsToDeadline;
        
        // Check if this scenario alone is really sufficient to reach the goal
        const scenarioPossible = newTotalSaved >= goalAmount;
        
        expenseScenarios.push({
          priority,
          removedExpenses: priorityExpenses.length,
          monthlySavings,
          newAvailableMoney,
          newMonthlySaving: currentMonthlyWithNewAvailable,
          newTotalSaved,
          possible: scenarioPossible,
          expenseDetails // Adding expense details
        });
      }
      
      // Scenario 4: Combination of percentage adjustment and expense removal
      const combinedScenarios = [];
      
      for (let priority = 1; priority <= 3; priority++) { // Only consider priorities 1-3
        // Find the expense removal scenario for this priority
        const expenseScenario = expenseScenarios.find(s => s.priority === priority);
        
        if (expenseScenario && expenseScenario.newAvailableMoney > 0) {
          const newNeededPerMonth = goalAmount / monthsToDeadline;
          const newNeededPercentage = (newNeededPerMonth / expenseScenario.newAvailableMoney) * 100;
          
          // Check if the combination is really viable
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
      
      // Check additional scenario: remove expenses in multiple priorities
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
              name: expense.name || expense.description || `Expense ${expense.id}`,
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
      
      // PRIORIDADE MÁXIMA: Ajuste de Porcentagem (se for possível)
      if (percentageScenario.possible) {
        mostEfficientScenario = {
          type: 'percentage',
          newPercentage: percentageScenario.newPercentage,
          possible: true,
          message: `Adjust savings to ${percentageScenario.newPercentage.toFixed(2)}% to reach your goal.`
        };
      }
      // If percentage adjustment isn't possible, check low priority expenses
      else if (expenseScenarios.some(s => s.priority === 1 && s.possible)) {
        const scenario = expenseScenarios.find(s => s.priority === 1 && s.possible);
        const expenseNamesText = scenario.expenseDetails && scenario.expenseDetails.length > 0
          ? scenario.expenseDetails.map(e => e.name).join(", ")
          : `${scenario.removedExpenses} expense(s)`;
          
        mostEfficientScenario = {
          type: 'expense',
          priority: scenario.priority,
          possible: true,
          monthlySavings: scenario.monthlySavings,
          expenseDetails: scenario.expenseDetails,
          message: `Remove priority ${scenario.priority} expenses (${expenseNamesText}) to reach your goal.`
        };
      }
      // Check priority 2 expenses
      else if (expenseScenarios.some(s => s.priority === 2 && s.possible)) {
        const scenario = expenseScenarios.find(s => s.priority === 2 && s.possible);
        const expenseNamesText = scenario.expenseDetails && scenario.expenseDetails.length > 0
          ? scenario.expenseDetails.map(e => e.name).join(", ")
          : `${scenario.removedExpenses} expense(s)`;
          
        mostEfficientScenario = {
          type: 'expense',
          priority: scenario.priority,
          possible: true,
          monthlySavings: scenario.monthlySavings,
          expenseDetails: scenario.expenseDetails,
          message: `Remove priority ${scenario.priority} expenses (${expenseNamesText}) to reach your goal.`
        };
      }
      // Check priority 3 expenses
      else if (expenseScenarios.some(s => s.priority === 3 && s.possible)) {
        const scenario = expenseScenarios.find(s => s.priority === 3 && s.possible);
        const expenseNamesText = scenario.expenseDetails && scenario.expenseDetails.length > 0
          ? scenario.expenseDetails.map(e => e.name).join(", ")
          : `${scenario.removedExpenses} expense(s)`;
          
        mostEfficientScenario = {
          type: 'expense',
          priority: scenario.priority,
          possible: true,
          monthlySavings: scenario.monthlySavings,
          expenseDetails: scenario.expenseDetails,
          message: `Remove priority ${scenario.priority} expenses (${expenseNamesText}) to reach your goal.`
        };
      }
      // Check multiple priority scenarios
      else if (multiPriorityScenarios.some(s => s.possible)) {
        // Sort by priority sum (lower is better)
        const possibleMulti = multiPriorityScenarios.filter(s => s.possible)
          .sort((a, b) => {
            const sumA = a.priorities.reduce((sum, p) => sum + p, 0);
            const sumB = b.priorities.reduce((sum, p) => sum + p, 0);
            return sumA - sumB;
          });
          
        if (possibleMulti.length > 0) {
          const bestMulti = possibleMulti[0];
          
          mostEfficientScenario = {
            type: 'multiPriority',
            priorities: bestMulti.priorities,
            possible: true,
            monthlySavings: bestMulti.monthlySavings,
            expenseDetails: bestMulti.expenseDetails,
            message: `Remove priority ${bestMulti.priorities.join(', ')} expenses to reach your goal.`
          };
        }
      }
      // Check combined scenarios
      else if (combinedScenarios.some(s => s.possible)) {
        // Sort by priority (lower is better)
        const possibleCombined = combinedScenarios.filter(s => s.possible)
          .sort((a, b) => a.priority - b.priority);
          
        if (possibleCombined.length > 0) {
          const bestCombined = possibleCombined[0];
          const expenseNamesText = bestCombined.expenseDetails && bestCombined.expenseDetails.length > 0
            ? bestCombined.expenseDetails.map(e => e.name).join(", ")
            : `${bestCombined.removedExpenses} expense(s)`;
            
          mostEfficientScenario = {
            type: 'combined',
            priority: bestCombined.priority,
            newPercentage: bestCombined.newPercentage,
            possible: true,
            monthlySavings: bestCombined.monthlySavings,
            expenseDetails: bestCombined.expenseDetails,
            message: `Adjust to ${bestCombined.newPercentage.toFixed(2)}% and remove priority ${bestCombined.priority} expenses (${expenseNamesText}).`
          };
        }
      }
      // Last case, current scenario (if possible)
      else if (baseScenario.possible) {
        mostEfficientScenario = {
          type: 'current',
          possible: true,
          monthlyAmount: baseScenario.monthlyAmount,
          totalSaved: baseScenario.totalSaved,
          message: `Current configuration is already sufficient (${goal.goal_saving_minimum}%).`
        };
      }
      
      // Recommended scenario
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

  // Function to calculate allocation values
  export const calculateAllocationValue = (goals, availableMoney, currentGoalId = null, newPercentage = 0) => {
    if (!goals || !Array.isArray(goals)) {
      return {
        totalPercentage: 0,
        totalFixedValue: 0,
        isValid: true,
        message: 'No goals found'
      };
    }

    // Validate new value
    const roundedNewPercentage = newPercentage ? parseFloat(Number(newPercentage).toFixed(2)) : 0;
    if (roundedNewPercentage < 0 || roundedNewPercentage > 100) {
      return {
        totalPercentage: 0,
        totalFixedValue: 0,
        isValid: false,
        message: 'Invalid percentage. Must be between 0 and 100.'
      };
    }

    const allocation = goals.reduce((acc, goal) => {
      // Ignore current goal if editing
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

    // Round to 2 decimal places
    allocation.totalPercentage = Number(allocation.totalPercentage.toFixed(2));
    allocation.totalFixedValue = Number(allocation.totalFixedValue.toFixed(2));

    // Calculate new total including new percentage
    const newTotalPercentage = allocation.totalPercentage + roundedNewPercentage;
    const newTotalFixedValue = (newTotalPercentage / 100) * availableMoney;

    // Validations
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
        ? `Current allocation: ${allocation.totalPercentage}% (${formatCurrency(allocation.totalFixedValue)})`
        : `Allocation exceeds 100% (${newTotalPercentage}%)`,
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


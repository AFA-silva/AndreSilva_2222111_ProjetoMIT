import { supabase } from '../../Supabase';

/**
 * StatisticsService - A centralized service for managing user lifetime statistics
 * Tracks total lifetime goals_created, expenses_created, and income_created in the user_profile table
 * Statistics only increment (never decrement) to show total user activity over time
 */

export class StatisticsService {
  /**
   * Increment a statistic for a user
   * @param {string} userId - The user's ID
   * @param {string} type - The statistic type: 'goals', 'expenses', or 'income'
   * @param {number} increment - Amount to increment (default: 1)
   */
  static async incrementStatistic(userId, type, increment = 1) {
    try {
      if (!userId) {
        console.error('StatisticsService: userId is required');
        return false;
      }

      if (!['goals', 'expenses', 'income'].includes(type)) {
        console.error('StatisticsService: Invalid type. Must be "goals", "expenses", or "income"');
        return false;
      }

      // First, try to get current statistics
      const { data: currentData, error: fetchError } = await supabase
        .from('user_profile')
        .select(`${type}_created`)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('StatisticsService: Error fetching current statistics:', fetchError);
        return false;
      }

      // If no profile exists, create one
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ 
            user_id: userId,
            [`${type}_created`]: increment
          }]);

        if (insertError) {
          console.error('StatisticsService: Error creating profile:', insertError);
          return false;
        }

        console.log(`StatisticsService: Created new profile and incremented ${type}_created to ${increment}`);
        return true;
      }

      // Update existing profile
      const currentValue = currentData[`${type}_created`] || 0;
      const newValue = currentValue + increment;

      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ [`${type}_created`]: newValue })
        .eq('user_id', userId);

      if (updateError) {
        console.error('StatisticsService: Error updating statistics:', updateError);
        return false;
      }

      console.log(`StatisticsService: Updated ${type}_created from ${currentValue} to ${newValue}`);
      return true;

    } catch (error) {
      console.error('StatisticsService: Unexpected error:', error);
      return false;
    }
  }



  /**
   * Get all statistics for a user
   * @param {string} userId - The user's ID
   * @returns {object} Statistics object or null if error
   */
  static async getUserStatistics(userId) {
    try {
      if (!userId) {
        console.error('StatisticsService: userId is required');
        return null;
      }

      const { data, error } = await supabase
        .from('user_profile')
        .select('account_age, goals_created, expenses_created, income_created')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('StatisticsService: Error fetching statistics:', error);
        return null;
      }

      return {
        account_age: data.account_age || 0,
        goals_created: data.goals_created || 0,
        expenses_created: data.expenses_created || 0,
        income_created: data.income_created || 0,
      };

    } catch (error) {
      console.error('StatisticsService: Unexpected error:', error);
      return null;
    }
  }

  /**
   * Batch update multiple statistics
   * @param {string} userId - The user's ID
   * @param {object} updates - Object with statistics to update {goals: 1, expenses: 2, income: 1}
   */
  static async batchUpdateStatistics(userId, updates) {
    try {
      if (!userId) {
        console.error('StatisticsService: userId is required');
        return false;
      }

      // Validate updates object
      const validTypes = ['goals', 'expenses', 'income'];
      const updateObj = {};
      
      for (const [type, increment] of Object.entries(updates)) {
        if (validTypes.includes(type) && typeof increment === 'number') {
          updateObj[`${type}_created`] = increment;
        }
      }

      if (Object.keys(updateObj).length === 0) {
        console.error('StatisticsService: No valid updates provided');
        return false;
      }

      // Get current statistics
      const { data: currentData, error: fetchError } = await supabase
        .from('user_profile')
        .select('goals_created, expenses_created, income_created')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('StatisticsService: Error fetching current statistics:', fetchError);
        return false;
      }

      // Calculate new values
      const finalUpdates = {};
      for (const [key, increment] of Object.entries(updateObj)) {
        const currentValue = currentData ? (currentData[key] || 0) : 0;
        finalUpdates[key] = currentValue + increment;
      }

      // If no profile exists, create one
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert([{ user_id: userId, ...finalUpdates }]);

        if (insertError) {
          console.error('StatisticsService: Error creating profile:', insertError);
          return false;
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profile')
          .update(finalUpdates)
          .eq('user_id', userId);

        if (updateError) {
          console.error('StatisticsService: Error updating statistics:', updateError);
          return false;
        }
      }

      console.log('StatisticsService: Batch updated statistics:', finalUpdates);
      return true;

    } catch (error) {
      console.error('StatisticsService: Unexpected error:', error);
      return false;
    }
  }
}

// Convenience functions for easier usage
export const incrementGoalsCreated = (userId, increment = 1) => 
  StatisticsService.incrementStatistic(userId, 'goals', increment);

export const incrementExpensesCreated = (userId, increment = 1) => 
  StatisticsService.incrementStatistic(userId, 'expenses', increment);

export const incrementIncomeCreated = (userId, increment = 1) => 
  StatisticsService.incrementStatistic(userId, 'income', increment);

export default StatisticsService; 
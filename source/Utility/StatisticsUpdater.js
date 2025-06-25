import { supabase } from '../../Supabase';

class StatisticsUpdater {
  /**
   * Update user statistics in the user_profile table
   * @param {string} userId - The user's ID
   * @param {string} type - Type of statistic ('income', 'expenses', 'goals')
   * @param {number} increment - Amount to increment (can be negative to decrement)
   */
  static async updateStatistic(userId, type, increment = 1) {
    try {
      if (!userId || !type) {
        console.error('Missing userId or type for statistics update');
        return;
      }

      // Get current statistics
      const { data: currentData, error: fetchError } = await supabase
        .from('user_profile')
        .select(`${type}_created`)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching current statistics:', fetchError);
        return;
      }

      // Calculate new value
      const currentValue = currentData?.[`${type}_created`] || 0;
      const newValue = Math.max(0, currentValue + increment); // Prevent negative values

      // Update the statistic
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({
          [`${type}_created`]: newValue
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating statistics:', updateError);
        return;
      }

      console.log(`Successfully updated ${type}_created to ${newValue} for user ${userId}`);
      return newValue;

    } catch (error) {
      console.error('Error in updateStatistic:', error);
    }
  }

  /**
   * Increment income created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to add (default: 1)
   */
  static async incrementIncome(userId, count = 1) {
    return await this.updateStatistic(userId, 'income', count);
  }

  /**
   * Increment expenses created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to add (default: 1)
   */
  static async incrementExpenses(userId, count = 1) {
    return await this.updateStatistic(userId, 'expenses', count);
  }

  /**
   * Increment goals created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to add (default: 1)
   */
  static async incrementGoals(userId, count = 1) {
    return await this.updateStatistic(userId, 'goals', count);
  }

  /**
   * Decrement income created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to subtract (default: 1)
   */
  static async decrementIncome(userId, count = 1) {
    return await this.updateStatistic(userId, 'income', -count);
  }

  /**
   * Decrement expenses created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to subtract (default: 1)
   */
  static async decrementExpenses(userId, count = 1) {
    return await this.updateStatistic(userId, 'expenses', -count);
  }

  /**
   * Decrement goals created count
   * @param {string} userId - The user's ID
   * @param {number} count - Number to subtract (default: 1)
   */
  static async decrementGoals(userId, count = 1) {
    return await this.updateStatistic(userId, 'goals', -count);
  }

  /**
   * Get all statistics for a user
   * @param {string} userId - The user's ID
   */
  static async getUserStatistics(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('account_age, goals_created, expenses_created, income_created')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user statistics:', error);
        return null;
      }

      return {
        account_age: data.account_age || 0,
        goals_created: data.goals_created || 0,
        expenses_created: data.expenses_created || 0,
        income_created: data.income_created || 0,
      };

    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      return null;
    }
  }
}

export default StatisticsUpdater; 
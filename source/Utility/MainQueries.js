import { supabase } from '../../Supabase';

// Fetch the current user's session
export const getSession = async () => {
  try {
    const { data: session, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      console.log('Session fetched successfully:', session);
      return session;
    } else {
      console.log('No active session found.');
      return null;
    }
  } catch (err) {
    console.error('Error fetching session:', err);
    return null;
  }
};

// Fetch user data by their unique ID
export const fetchUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    console.log('User fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return null;
  }
};

// Fetch user data by email
export const fetchUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    console.log('User fetched successfully:', data);
    return data;
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
};

// Create a new user in the database
export const createUser = async (userDetails) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userDetails]);

    if (error) throw error;

    console.log('User created successfully:', data);
    return data;
  } catch (err) {
    console.error('Error creating user:', err);
    return null;
  }
};

// Update an existing user's data
export const updateUser = async (userId, updates) => {
  console.log('updateUser called with:', { userId, updates });

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user:', error.message);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log(`No rows updated. The user ID ${userId} may not exist or the update conditions did not match.`);
      return { data: null, error: null }; // Removed warning and considered it a no-op.
    }

    console.log('User updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in updateUser:', err);
    return { data: null, error: err };
  }
};

// Delete a user by ID
export const deleteUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    console.log('User deleted successfully:', data);
    return data;
  } catch (err) {
    console.error('Error deleting user:', err);
    return null;
  }
};
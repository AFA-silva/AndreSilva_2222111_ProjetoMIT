import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../Styles/MainPageStyles/MainMenuPageStyle';
import { supabase } from '../../Supabase';

const MainMenuPage = ({ navigation }) => {
  const [okCount, setOkCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [problemCount, setProblemCount] = useState(0);

  useEffect(() => {
    const fetchGoalStatuses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: goals } = await supabase
        .from('goals')
        .select('status')
        .eq('user_id', user.id);
      if (!goals) return;
      let ok = 0, warnings = 0, problems = 0;
      for (const goal of goals) {
        if (goal.status === 3) problems++;
        else if (goal.status === 2) warnings++;
        else if (goal.status === 1) ok++;
      }
      setOkCount(ok);
      setWarningCount(warnings);
      setProblemCount(problems);
    };
    fetchGoalStatuses();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.menuGrid}>
        <TouchableOpacity
          style={[styles.menuItem, { borderColor: '#FDCB6E', borderWidth: 2, minHeight: 120, justifyContent: 'center' }]}
          onPress={() => navigation.navigate('GoalsPage')}
        >
          <Text style={{ fontWeight: 'bold', color: '#2D3436', fontSize: 16, marginBottom: 8 }}>Goals Info:</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <Ionicons name="checkmark-circle" size={32} color="#00B894" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 22, color: '#00B894', fontWeight: 'bold', marginRight: 12 }}>{okCount}</Text>
            <Ionicons name="warning" size={32} color="#FDCB6E" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 22, color: '#FDCB6E', fontWeight: 'bold', marginRight: 12 }}>{warningCount}</Text>
            <Ionicons name="alert-circle" size={32} color="#E74C3C" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 22, color: '#E74C3C', fontWeight: 'bold' }}>{problemCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MainMenuPage;
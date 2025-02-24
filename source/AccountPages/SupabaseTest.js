import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from './Supabase';

export default function SupabaseTest() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('your_table_name') // Substitua 'your_table_name' pelo nome da sua tabela no Supabase
        .select('*');
      
      if (error) {
        console.error(error);
      } else {
        setData(data);
      }
    }

    fetchData();
  }, []);

  return (
    <View>
      <Text>Supabase Data:</Text>
      {data ? (
        data.map((item, index) => (
          <Text key={index}>{JSON.stringify(item)}</Text>
        ))
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
}
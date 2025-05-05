import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const Chart = ({ data, labels, width = 350, height = 220, title = "Chart", chartConfig }) => {
  const defaultChartConfig = {
    backgroundColor: '#FFF',
    backgroundGradientFrom: '#F57C00',
    backgroundGradientTo: '#FFA726',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  return (
    <View>
      <LineChart
        data={{
          labels: labels || [],
          datasets: [
            {
              data: data || [],
            },
          ],
        }}
        width={width} // Width of the chart
        height={height} // Height of the chart
        chartConfig={chartConfig || defaultChartConfig} // Chart styling and config
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
};

export default Chart;
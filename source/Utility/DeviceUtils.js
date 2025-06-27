import * as Device from 'expo-device';
import { supabase } from '../../Supabase';

// Fetch the real public IP address using a public API
export const getPublicIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error);
    return 'Unknown';
  }
};

// Fetch the city/country from the public IP using ipinfo.io, with fallback to ip-api.com
export const getCityFromIP = async (ip) => {
  try {
    if (!ip || ip === 'Unknown') {
      console.log('No valid IP provided to getCityFromIP:', ip);
      return 'Unknown';
    }
    console.log('Fetching location for IP:', ip);
    // Try ipinfo.io first
    let data;
    try {
      const response = await fetch(`https://api.ipinfo.io/${ip}?token=5cf62a68ea1917`);
      data = await response.json();
      console.log('🌍 IPINFO Response:', data);
      if (data.error) {
        console.error('ipinfo.io error:', data.error);
        data = null;
      }
    } catch (ipinfoError) {
      console.error('Error fetching from ipinfo.io:', ipinfoError);
      data = null;
    }
    // If ipinfo.io worked and has a country code
    if (data && data.country && data.country !== '') {
      try {
        const restResponse = await fetch(`https://restcountries.com/v3.1/alpha/${data.country}`);
        const restData = await restResponse.json();
        console.log('🌍 RESTCountries Response:', restData);
        if (Array.isArray(restData) && restData[0] && restData[0].name && restData[0].name.common) {
          return restData[0].name.common;
        }
      } catch (restError) {
        console.error('Error fetching country name from RESTCountries:', restError);
      }
      // Fallback to country code if full name not found
      return data.country;
    }
    // Fallback: Try ip-api.com
    try {
      const fallbackResponse = await fetch(`http://ip-api.com/json/${ip}`);
      const fallbackData = await fallbackResponse.json();
      console.log('🌍 ip-api.com Response:', fallbackData);
      if (fallbackData && fallbackData.country) {
        return fallbackData.country;
      }
    } catch (fallbackError) {
      console.error('Error fetching from ip-api.com:', fallbackError);
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching country from IP (getCityFromIP):', error);
    return 'Unknown';
  }
};

// Register device access in the database
export const registerDeviceAccess = async (userSession) => {
  try {
    if (!userSession || !userSession.user || !userSession.user.id) return;
    // Get detailed device information using expo-device (with fallback to 'Unknown')
    const deviceName = Device.deviceName || 'Unknown';
    const deviceModel = Device.modelName || 'Unknown';
    const modelCode = Device.modelId || 'Unknown';
    const manufacturer = Device.manufacturer || 'Unknown';
    const brand = Device.brand || 'Unknown';
    const osVersion = Device.osVersion || 'Unknown';
    // Create a more descriptive device model string (include model code)
    let detailedModel = 'Unknown';
    if (brand && deviceModel && modelCode && manufacturer && brand !== 'Unknown' && deviceModel !== 'Unknown' && modelCode !== 'Unknown' && manufacturer !== 'Unknown') {
      detailedModel = `${brand} ${deviceModel} (${modelCode}, ${manufacturer})`;
    } else if (brand && deviceModel && manufacturer && brand !== 'Unknown' && deviceModel !== 'Unknown' && manufacturer !== 'Unknown') {
      detailedModel = `${brand} ${deviceModel} (${manufacturer})`;
    } else if (deviceModel && deviceModel !== 'Unknown') {
      detailedModel = deviceModel;
    }
    // Fetch the real public IP address
    const realIP = await getPublicIP();
    // Fetch the city from the IP
    const city = await getCityFromIP(realIP);
    // Build deviceData with fallbacks
    const deviceData = {
      user_id: userSession.user.id,
      model: detailedModel || 'Unknown',
      name: deviceName || 'Unknown',
      ip_address: realIP || 'Unknown',
      location: city || 'Unknown',
      authorized: true,
      last_access: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    // Check if device already exists
    const { data: existingDevice, error: checkError } = await supabase
      .from('device_info')
      .select('*')
      .eq('user_id', userSession.user.id)
      .eq('model', deviceData.model)
      .eq('name', deviceData.name)
      .single();
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing device:', checkError);
      return;
    }
    if (existingDevice) {
      // Update last access
      await supabase
        .from('device_info')
        .update({ last_access: deviceData.last_access })
        .eq('id', existingDevice.id);
    } else {
      // Insert new device (with created_at)
      await supabase
        .from('device_info')
        .insert([deviceData]);
    }
  } catch (error) {
    console.error('Error registering device access:', error);
  }
}; 
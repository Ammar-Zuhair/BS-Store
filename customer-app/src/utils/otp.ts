import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export function otpDigits(value: string): string {
  return value.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0));
}

export function normalizeYemenPhone(input: string): string | null {
  let phone = otpDigits(input.trim()).replace(/[\s()\-]/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('967')) phone = phone.slice(3);
  if (phone.startsWith('0')) phone = phone.slice(1);
  return /^7[01378][0-9]{7}$/.test(phone) ? `+967${phone}` : null;
}

let deviceId: Promise<string> | undefined;
export function getOtpDeviceId(): Promise<string> {
  return deviceId ??= (async () => {
    const existing = await AsyncStorage.getItem('@bs_customer_otp_device');
    if (existing) return existing;
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem('@bs_customer_otp_device', id);
    return id;
  })();
}

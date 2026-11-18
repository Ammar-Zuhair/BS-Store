import React from 'react';
import { Modal, ModalProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Native iOS modals otherwise default to portrait even when the app can rotate.
export function ResponsiveModal({ children, ...props }: ModalProps) {
  return <Modal supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']} {...props}>
    {props.transparent ? <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>{children}</SafeAreaView> : children}
  </Modal>;
}

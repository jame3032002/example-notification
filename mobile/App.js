import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import React, { useState, useEffect, useRef } from 'react'
import { Text, View, Button, Platform, Alert, Clipboard } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
})

export default function App () {
  const [expoPushToken, setExpoPushToken] = useState('')
  const [error, setError] = useState('')
  const [notification, setNotification] = useState(false)
  const notificationListener = useRef()
  const responseListener = useRef()
  const copyToClipboard = (text) => {
    Clipboard.setString(text)
  }

  useEffect(() => {
    Alert.alert('useEffect')
    registerForPushNotificationsAsync()
      .then(token => {
        Alert.alert(token)
        setExpoPushToken(token)
      })
      .catch(error => {
        setError(error.message)
        Alert.alert(error.message)
      })

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      setNotification(response)
    })

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around'
      }}
    >
      <Text>Your expo push token: {expoPushToken}</Text>
      <Text>Error: {error}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title='Copy'
        onPress={copyToClipboard.bind(this, expoPushToken)}
      />
    </View>
  )
}

async function registerForPushNotificationsAsync () {
  let token
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!')
      return
    }

    token = (await Notifications.getDevicePushTokenAsync()).data
    console.log(token)
  } else {
    Alert.alert('Must use physical device for Push Notifications')
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C'
    })
  }

  return token
}

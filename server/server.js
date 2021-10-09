const fs = require('fs')
const http2 = require('http2')
const axios = require('axios')
const express = require('express')
const jwt = require('jsonwebtoken')
const app = express()
const PORT = 2000

require('dotenv').config()

const NATIVE_TOKEN = '' // กรอก Device Token ที่จะทดสอบ

app.get('/send-notification', async (req, res) => {
  try {
    const response = await axios({
      method: 'post',
      url: process.env.FCM_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${process.env.FCM_SERVER_KEY}`
      },
      data: JSON.stringify({
        to: NATIVE_TOKEN,
        priority: 'normal',
        data: {
          experienceId: `${process.env.EXPO_USERNAME}/${process.env.EXPO_SLUG}`,
          title: 'blog.me-idea.in.th',
          message: 'ทดสอบส่ง message ผ่าน server โดยใช้ Firebase Cloud Messaging',
          body: JSON.stringify({ photoId: 42 })
        }
      })
    })

    console.log(response.data)

    return res.json({ success: true })
  } catch (error) {
    console.log(error.message)
    return res.json({ success: false })
  }
})

app.get('/send-notification-ios', async (req, res) => {
  try {
    const NATIVE_DEVICE_TOKEN = '3adf124c8b49bbfee9aa57e5d6991fc5ba4f8c5b69f88a716c03fdbf0ef34b15'
    await sendIOSNotification({ nativeDeviceToken: NATIVE_DEVICE_TOKEN })
    return res.json({ success: true })
  } catch (error) {
    const { reason } = JSON.parse(error.message)
    return res.json({ success: false, message: reason })
  }
})

function sendIOSNotification ({ nativeDeviceToken }) {
  return new Promise((resolve, reject) => {
    const APPLE_TEAM_ID = process.env.IOS_APPLE_TEAM_ID
    const APNS_KEY_P8_FILE = process.env.IOS_APNS_KEY_P8_FILE
    const P8_KEY_ID = process.env.IOS_P8_KEY_ID
    const BUNDLE_IDENTIFIER = process.env.IOS_BUNDLE_IDENTIFIER
    const EXPERIENCE_ID = `${process.env.EXPO_USERNAME}/${process.env.EXPO_SLUG}`

    const authorizationToken = jwt.sign(
      {
        iss: APPLE_TEAM_ID,
        iat: Math.round(new Date().getTime() / 1000)
      },
      fs.readFileSync(APNS_KEY_P8_FILE, 'utf8'),
      {
        header: {
          alg: 'ES256',
          kid: P8_KEY_ID
        }
      }
    )

    const client = http2.connect('https://api.push.apple.com')
    const request = client.request({
      ':method': 'POST',
      ':scheme': 'https',
      'apns-topic': BUNDLE_IDENTIFIER,
      ':path': '/3/device/' + nativeDeviceToken, // This is the native device token you grabbed client-side
      authorization: `bearer ${authorizationToken}` // This is the JSON web token we generated in the "Authorization" step above
    })

    request.setEncoding('utf8')
    request.write(
      JSON.stringify({
        aps: {
          alert: {
            title: "\uD83D\uDCE7 You've got mail!",
            body: 'Hello world! \uD83C\uDF10'
          }
        },
        experienceId: EXPERIENCE_ID // Required when testing in the Expo Go app
      })
    )

    request.on('response', (headers, flags) => {
      for (const name in headers) {
        console.log(`${name}: ${headers[name]}`)
      }
    })

    let data = ''
    request.on('data', (chunk) => {
      console.log('data', chunk)
      data += chunk
    })

    request.on('end', () => {
      client.close()
      if (data !== '') {
        return reject(new Error(data))
      }

      return resolve()
    })

    request.end()
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

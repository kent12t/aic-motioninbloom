import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function GameQrCode() {
  const [source, setSource] = useState('')

  useEffect(() => {
    void QRCode.toDataURL(window.location.href, {
      width: 160,
      margin: 1,
      color: { dark: '#2f1f24', light: '#ffffff' },
    }).then(setSource)
  }, [])

  return source ? <img className="qr-code" src={source} alt="QR code for Motion in Bloom" /> : null
}

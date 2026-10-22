import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function GameQrCode() {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    void QRCode.toDataURL(window.location.href, {
      width: 260,
      margin: 4,
      color: { dark: '#71308b', light: '#fbefcd' },
    }).then((url) => { if (active) setSource(url) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  return source ? <img className="qr-code" src={source} alt="QR code for Motion in Bloom" /> : null
}

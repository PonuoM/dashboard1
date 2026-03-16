import { useState, useEffect, useRef } from 'react'
import './App.css'
import logo from './components/icon/logo.png'

function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const canvasRef = useRef(null)

    // Canvas-based particle cursor effect
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const particles = []
        // เขียว ขาว ฟ้าอ่อน (ตามโทนเว็บ)
        const colors = ['#22c55e', '#4ade80', '#86efac', '#ffffff', '#bbf7d0', '#dcfce7']

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        class Particle {
            constructor(x, y) {
                this.x = x
                this.y = y
                this.size = Math.random() * 6 + 2
                this.speedX = (Math.random() - 0.5) * 2
                this.speedY = (Math.random() - 0.5) * 2 + 0.5
                this.color = colors[Math.floor(Math.random() * colors.length)]
                this.life = 1
                this.decay = 0.02 + Math.random() * 0.01
            }

            update() {
                this.x += this.speedX
                this.y += this.speedY
                this.speedY += 0.03
                this.life -= this.decay
                this.size *= 0.97
            }

            draw() {
                ctx.save()
                ctx.globalAlpha = this.life
                ctx.fillStyle = this.color
                ctx.shadowColor = this.color
                ctx.shadowBlur = 8
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
                ctx.fill()
                ctx.restore()
            }
        }

        let lastTime = 0
        const handleMouseMove = (e) => {
            const now = Date.now()
            if (now - lastTime < 25) return
            lastTime = now

            for (let i = 0; i < 2; i++) {
                particles.push(new Particle(
                    e.clientX + (Math.random() - 0.5) * 8,
                    e.clientY + (Math.random() - 0.5) * 8
                ))
            }
        }

        let animationId
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update()
                particles[i].draw()
                if (particles[i].life <= 0 || particles[i].size <= 0.3) {
                    particles.splice(i, 1)
                }
            }

            animationId = requestAnimationFrame(animate)
        }

        window.addEventListener('mousemove', handleMouseMove)
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouseMove)
            cancelAnimationFrame(animationId)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('./api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, rememberMe }),
            })

            const data = await response.json()

            if (data.success) {
                onLogin(data.user)
            } else {
                setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page-dashboard">
            <canvas ref={canvasRef} className="particle-canvas" />

            <div className="login-card-dashboard glass-card">
                <div className="login-logo-dashboard">
                    <img
                        src={logo}
                        alt="Primapassion49 Logo"
                        className="w-20 h-20 object-contain"
                    />
                </div>

                <h1 className="login-title-dashboard">เข้าสู่ระบบ</h1>

                <form onSubmit={handleSubmit} className="login-form-dashboard">
                    <div className="login-field-dashboard">
                        <label>ชื่อผู้ใช้</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="กรอกชื่อผู้ใช้"
                            required
                            autoComplete="username"
                            className="glass-input"
                        />
                    </div>

                    <div className="login-field-dashboard">
                        <label>รหัสผ่าน</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="กรอกรหัสผ่าน"
                            required
                            autoComplete="current-password"
                            className="glass-input"
                        />
                    </div>

                    <div className="login-remember-dashboard">
                        <label className="login-checkbox-dashboard">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>จำรหัสผ่าน</span>
                        </label>
                    </div>

                    {error && <div className="login-error-dashboard">{error}</div>}

                    <button type="submit" className="login-btn-dashboard btn-primary-glow" disabled={loading}>
                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="login-footer-dashboard">
                    Prima Dashboard © 2026
                </div>
            </div>
        </div>
    )
}

export default Login

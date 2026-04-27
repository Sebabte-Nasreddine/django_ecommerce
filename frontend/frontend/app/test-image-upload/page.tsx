'use client'
import { useState } from 'react'

export default function ImageTestPage() {
    const [file, setFile] = useState<File | null>(null)
    const [uploadedUrl, setUploadedUrl] = useState<string>('')
    const [status, setStatus] = useState<string>('')
    const [uploadPath, setUploadPath] = useState<string>('')

    const handleUpload = async () => {
        if (!file) return
        try {
            setStatus('Uploading...')
            const formData = new FormData()
            formData.append('file', file)
            const token = localStorage.getItem('sefa_token')
            const response = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            })
            const data = await response.json()
            console.log('Response:', data)
            if (data.url) {
                setUploadedUrl(data.url)
                setStatus(`✅ Success: ${data.url}`)
            } else {
                setStatus('❌ No URL in response')
            }
        } catch (error) {
            setStatus(`❌ Error: ${error}`)
        }
    }

    const checkBackend = async () => {
        try {
            const response = await fetch('/api/debug/upload-path')
            const data = await response.json()
            console.log('Backend:', data)
            setUploadPath(JSON.stringify(data, null, 2))
        } catch (error) {
            setUploadPath(`Error: ${error}`)
        }
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Image Upload Test</h1>
            
            <section style={{ marginBottom: '20px' }}>
                <h2>1. Backend Status</h2>
                <button onClick={checkBackend}>Check Upload Path</button>
                <pre style={{ background: '#f0f0f0', padding: '10px' }}>{uploadPath}</pre>
            </section>

            <section style={{ marginBottom: '20px' }}>
                <h2>2. Upload Image</h2>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button onClick={handleUpload}>Upload</button>
                <p>{status}</p>
            </section>

            <section>
                <h2>3. Display Image</h2>
                {uploadedUrl && (
                    <div>
                        <p>URL: {uploadedUrl}</p>
                        <p>Full URL: {uploadedUrl.startsWith('/') ? `http://localhost:8080${uploadedUrl}` : uploadedUrl}</p>
                        <img 
                            src={uploadedUrl.startsWith('/') ? `http://localhost:8080${uploadedUrl}` : uploadedUrl}
                            alt="Uploaded" 
                            style={{ maxWidth: '200px', border: '1px solid red' }}
                            onLoad={() => setStatus('✅ Image loaded')}
                            onError={() => setStatus('❌ Image failed to load')}
                        />
                    </div>
                )}
            </section>
        </div>
    )
}

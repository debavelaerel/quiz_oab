import { afterEach, describe, expect, it } from 'vitest'
import { configClienteS3, s3Configurado } from './s3'

const ENV = { ...process.env }
afterEach(() => { process.env = { ...ENV } })

describe('s3', () => {
  it('só precisa de BUCKET_NAME para estar configurado', () => {
    delete process.env.BUCKET_NAME
    expect(s3Configurado()).toBe(false)
    process.env.BUCKET_NAME = 'b'
    expect(s3Configurado()).toBe(true)
  })
  it('sem chaves usa a cadeia padrão (IAM role): não passa credentials', () => {
    process.env.BUCKET_NAME = 'b'; delete process.env.ACCESS_KEY; delete process.env.SECRET_KEY
    expect(configClienteS3().credentials).toBeUndefined()
  })
  it('com chaves passa credentials', () => {
    process.env.BUCKET_NAME = 'b'; process.env.ACCESS_KEY = 'a'; process.env.SECRET_KEY = 's'
    expect(configClienteS3().credentials).toEqual({ accessKeyId: 'a', secretAccessKey: 's' })
  })
  it('endpoint público tem prioridade e liga path-style', () => {
    process.env.BUCKET_NAME = 'b'
    process.env.S3_ENDPOINT = 'http://minio:9000'
    process.env.S3_PUBLIC_ENDPOINT = 'http://localhost:9000'
    const c = configClienteS3()
    expect(c.endpoint).toBe('http://localhost:9000')
    expect(c.forcePathStyle).toBe(true)
  })
})

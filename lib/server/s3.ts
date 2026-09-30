import { GetObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Configurado = () => Boolean(process.env.BUCKET_NAME)

/** Config do cliente usado só para ASSINAR (não conecta): o endpoint é o que o NAVEGADOR enxerga. */
export function configClienteS3(): S3ClientConfig {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || undefined
  const cfg: S3ClientConfig = { region: process.env.REGION || 'us-east-1' }
  if (endpoint) { cfg.endpoint = endpoint; cfg.forcePathStyle = true }
  if (process.env.ACCESS_KEY && process.env.SECRET_KEY) {
    cfg.credentials = { accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_KEY }
  }
  return cfg
}

export async function assinarUrl(chave: string, segundos = 300): Promise<string> {
  const cliente = new S3Client(configClienteS3())
  return getSignedUrl(cliente, new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: chave }), { expiresIn: segundos })
}

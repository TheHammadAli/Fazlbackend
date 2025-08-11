import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class FileUploadService {
  private s3: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Missing AWS S3 configuration');
    }

    console.log(`Initializing S3 client with bucket: ${bucket}`, accessKeyId, secretAccessKey, region);

    this.bucketName = bucket;
    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadProductFiles(
    files: Express.Multer.File[],
    type: string,
    entityId: string,
    productId: string,
  ): Promise<{ key: string; url: string }[]> {
    const uploadedFiles: { key: string; url: string }[] = [];

    console.log('Uploading files:', files);
    for (const file of files) {
      const fileExt = extname(file.originalname);
      const uniqueName = `${uuidv4()}${fileExt}`;
      const key = `${type}/${entityId}/products/${productId}/${uniqueName}`;

      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        console.log(`Uploading file to S3 with key: ${key}`);
        await this.s3.send(command);

        const url = `https://${this.bucketName}.s3.${this.configService.get(
          'AWS_REGION',
        )}.amazonaws.com/${key}`;

        console.log(`File uploaded successfully: ${url}`);
        uploadedFiles.push({ key, url });
      } catch (err) {
        console.error('S3 upload error:', err);
        throw new InternalServerErrorException(
          'One or more file uploads failed',
        );
      }
    }

    return uploadedFiles;
  }
}

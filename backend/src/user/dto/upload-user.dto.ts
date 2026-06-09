import { IsNotEmpty } from 'class-validator';

export class UploadUserDto {
  @IsNotEmpty()
  username: string;
  @IsNotEmpty()
  password: string; // kalau pakai auth lokal
  @IsNotEmpty()
  description: string; //ini hanya untuk inisialisasi ROLE saja pas login pertama
  @IsNotEmpty()
  role: string;
  @IsNotEmpty()
  isActive: boolean;
  @IsNotEmpty()
  displayName: string;
  homeWarehouse: string;
  vendorName: string;
}

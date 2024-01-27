// create-todo.dto.ts
import { IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateTodoDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsDateString()
  valid_date: Date;

  @IsOptional()
  user_id: string;
}

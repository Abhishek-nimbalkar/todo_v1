// todo.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Headers,
  Req,
  Query,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() createTodoDto: CreateTodoDto,
    @Headers('timezone') timezone: string,
  ) {
    const userId = req.user.sub;
    return this.todoService.create(userId, createTodoDto, timezone);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
    @Headers('timezone') timezone: string,
  ) {
    const userId = req.user.sub;
    return this.todoService.findOne(userId, id, timezone);
  }

  @Get()
  async findAll(
    @Headers('user_id') userId: string,
    @Headers('timezone') timezone: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    page = page ? page : 1;
    limit = limit ? limit : 10;
    return this.todoService.findAll(userId, timezone, page, limit);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @Headers('timezone') timezone: string,
  ) {
    const userId = req.user.sub;
    return this.todoService.update(userId, id, updateTodoDto, timezone);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.todoService.delete(userId, id);
  }
}

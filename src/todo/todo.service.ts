// todo.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo } from './schema/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import * as moment from 'moment-timezone';
import { Redis } from 'ioredis';

@Injectable()
export class TodoService {
  private readonly redisClient: Redis;

  constructor(@InjectModel(Todo.name) private todoModel: Model<Todo>) {
    this.redisClient = new Redis();
  }

  async create(userId: string, createTodoDto: CreateTodoDto, timezone: string) {
    try {
      const newTodo = new this.todoModel({ ...createTodoDto, user_id: userId });
      const savedTodo: any = await newTodo.save();

      // Convert dates to the specified timezone
      savedTodo.createdAt = moment(savedTodo.createdAt)
        .utcOffset(timezone)
        .format();
      savedTodo.valid_date = moment(savedTodo.valid_date)
        .utcOffset(timezone)
        .format();

      // Update cache
      const todos = JSON.parse(await this.redisClient.get(userId)) || [];
      todos.push(savedTodo);
      await this.redisClient.set(userId, JSON.stringify(todos));

      return { success: true, todo: savedTodo };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  async findOne(userId: string, todoId: string, timezone: string) {
    try {
      let todo = JSON.parse(await this.redisClient.get(todoId));

      if (!todo) {
        todo = await this.todoModel.findOne({ _id: todoId, user_id: userId });

        if (!todo) {
          throw new NotFoundException('Todo not found');
        }

        await this.redisClient.set(todoId, JSON.stringify(todo));
      }

      // Convert dates to the specified timezone
      todo.createdAt = moment(todo.createdAt).tz(timezone).format();
      todo.valid_date = moment(todo.valid_date).tz(timezone).format();

      return { success: true, todo: todo };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  async findAll(userId: string, timezone: string, page: number, limit: number) {
    try {
      // Get todos from cache
      let todos = JSON.parse(await this.redisClient.get(userId));

      // If not in cache, get from database
      if (!todos) {
        todos = await this.todoModel.find({ user_id: userId }).exec();
        await this.redisClient.set(userId, JSON.stringify(todos));
      }

      // Convert dates to the specified timezone
      todos = todos.map((todo) => ({
        ...todo,
        createdAt: moment(todo.createdAt).utcOffset(timezone).format(),
        valid_date: moment(todo.valid_date).utcOffset(timezone).format(),
      }));

      // Implement pagination
      const start = (page - 1) * limit;
      const end = page * limit;
      const paginatedTodos = todos.slice(start, end);

      return { success: true, todos: paginatedTodos };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(
    userId: string,
    todoId: string,
    updateTodoDto: UpdateTodoDto,
    timezone: string,
  ) {
    try {
      const updatedTodo: any = await this.todoModel.findOneAndUpdate(
        { _id: todoId, user_id: userId },
        updateTodoDto,
        { new: true },
      );

      // Convert dates to the specified timezone
      updatedTodo.createdAt = moment(updatedTodo.createdAt)
        .utcOffset(timezone)
        .format();
      updatedTodo.valid_date = moment(updatedTodo.valid_date)
        .utcOffset(timezone)
        .format();

      // Update cache
      const todos = JSON.parse(await this.redisClient.get(userId)) || [];
      const todoIndex = todos.findIndex((todo) => todo._id === todoId);
      if (todoIndex !== -1) {
        todos[todoIndex] = updatedTodo;
      }
      await this.redisClient.set(userId, JSON.stringify(todos));

      return { success: true, todo: updatedTodo };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async delete(userId: string, todoId: string) {
    try {
      const deletedTodo = await this.todoModel.findOneAndDelete({
        _id: todoId,
        user_id: userId,
      });

      if (!deletedTodo) {
        throw new NotFoundException('Todo not found');
      }

      // Update cache
      const todos = JSON.parse(await this.redisClient.get(userId)) || [];
      const updatedTodos = todos.filter((todo) => todo._id !== todoId);
      await this.redisClient.set(userId, JSON.stringify(updatedTodos));

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

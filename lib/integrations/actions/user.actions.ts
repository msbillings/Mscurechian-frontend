"use server";

import { apiServer } from '../api/apiServer';
import { endpoints } from '../config';
import type { User } from '../types';

export async function getUsersAction(): Promise<User[]> {
  return apiServer<User[]>(endpoints.users);
}
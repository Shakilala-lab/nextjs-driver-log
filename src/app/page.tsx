"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import GenKitWrapper from '@/components/GenKitWrapper';
const userSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  carNumber: z.string().min(2, {
    message: "Car number must be at least 2 characters.",
  }),
});

function Welcome() {
  const router = useRouter();
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      carNumber: "",
    },
  });

  async function onSubmit(values: z.infer<typeof userSchema>) {
    console.log("User data:", values);
    router.push(`/data-entry?username=${values.username}&carNumber=${values.carNumber}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Добро пожаловать в ООО "ОПТИ-ТРАНС"</CardTitle>
        <CardDescription>Пожалуйста, введите ваше имя, чтобы начать.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>Имя</FormLabel>
              <FormControl>
                <Input placeholder="Введите имя" {...form.register("username")} />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel>Гос. номер автобуса</FormLabel>
              <FormControl>
                <Input placeholder="Введите гос. номер" {...form.register("carNumber")} />
              </FormControl>
              <FormMessage />
            </FormItem>
            <Button type="submit">Войти</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <Welcome />
        <GenKitWrapper/>
      </main>
    </div>
  );
}

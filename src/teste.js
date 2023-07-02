import { MongoClient, ObjectId } from "mongodb";
import { stripHtml } from "string-strip-html";
import { strict as assert } from "assert";
import express from "express";
import dotenv from "dotenv";
import dayjs from "dayjs";
import cors from "cors";
import Joi from "joi";

let someHtml = "Ana Luiza<script>alert(\"Evil script\")</script>";
let result = stripHtml(someHtml).result
console.log(result);
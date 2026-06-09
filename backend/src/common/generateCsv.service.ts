import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
const { Parser } = require('json2csv');

@Injectable()
export class GenerateCsvService {
  async generateCsv(logs: any): Promise<string> {
    const reportDir = path.join(process.cwd(), 'uploads', 'report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const filename = `flowlog_${Date.now()}.csv`;
    const filepath = path.join(reportDir, filename);

    const flat = logs.map((f) => ({
      title: f.title,
      type: f.type,
      amount: f.amount,
      warehouse: f.warehouse?.name || '',
      category: f.category?.name || '',
      createdBy: f.createdBy?.username || '',
      createdAt: f.createdAt
        ? typeof f.createdAt === 'string'
          ? f.createdAt
          : f.createdAt.toISOString()
        : '',
      note: f.note || '',
    }));
    const parser = new Parser();
    const csv = parser.parse(flat);

    // return relative URL for download, so frontend can use window.open directly
    return csv;
  }
}

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// GeoGebra 工具定义（LangChain 1.0 格式）
export const geogebraTools = [
  tool(
    async ({ name, x, y }) => {
      return { success: true, name, x, y };
    },
    {
      name: 'geogebra_create_point',
      description: '在 GeoGebra 中创建一个点',
      schema: z.object({
        name: z.string().describe('点的名称（例如："A", "P1"）'),
        x: z.number().describe('点的 X 坐标'),
        y: z.number().describe('点的 Y 坐标'),
      }),
    }
  ),

  tool(
    async ({ name, point1, point2 }) => {
      return { success: true, name, point1, point2 };
    },
    {
      name: 'geogebra_create_line',
      description: '在 GeoGebra 中创建一条直线',
      schema: z.object({
        name: z.string().describe('直线的名称'),
        point1: z.string().describe('第一个点的名称'),
        point2: z.string().describe('第二个点的名称'),
      }),
    }
  ),

  tool(
    async ({ name, center, radius }) => {
      return { success: true, name, center, radius };
    },
    {
      name: 'geogebra_create_circle',
      description: '在 GeoGebra 中创建一个圆',
      schema: z.object({
        name: z.string().describe('圆的名称'),
        center: z.string().describe('圆心的名称'),
        radius: z.number().describe('圆的半径'),
      }),
    }
  ),

  tool(
    async ({ name, expression, xMin, xMax, color }) => {
      return { success: true, name, expression, xMin, xMax, color };
    },
    {
      name: 'geogebra_plot_function',
      description: '绘制数学函数',
      schema: z.object({
        name: z.string().describe('函数的名称（例如："f", "g"）'),
        expression: z.string().describe('函数表达式（例如："x^2", "sin(x)"）'),
        xMin: z.number().optional().describe('定义域最小值（可选）'),
        xMax: z.number().optional().describe('定义域最大值（可选）'),
        color: z.string().optional().describe('函数颜色（可选）'),
      }),
    }
  ),

  tool(
    async ({ name, vertices }) => {
      return { success: true, name, vertices };
    },
    {
      name: 'geogebra_create_polygon',
      description: '创建多边形',
      schema: z.object({
        name: z.string().describe('多边形的名称'),
        vertices: z.array(z.string()).describe('顶点名称数组'),
      }),
    }
  ),

  tool(
    async () => {
      return { success: true };
    },
    {
      name: 'geogebra_clear_construction',
      description: '清除所有 GeoGebra 构造',
      schema: z.object({}),
    }
  ),

  tool(
    async ({ name, functionName, lowerBound, upperBound }) => {
      return { success: true, name, functionName, lowerBound, upperBound };
    },
    {
      name: 'geogebra_plot_integral',
      description: '绘制定积分的可视化图形（在函数和x轴之间填充阴影面积）。用于展示积分的几何意义。必须先定义函数，然后再调用此工具。',
      schema: z.object({
        name: z.string().describe('积分对象的名称'),
        functionName: z.string().describe('要积分的函数名称（需要先定义函数）'),
        lowerBound: z.number().describe('积分下限'),
        upperBound: z.number().describe('积分上限'),
      }),
    }
  ),

  tool(
    async ({ command }) => {
      return { success: true, command };
    },
    {
      name: 'geogebra_eval_command',
      description: '执行自定义 GeoGebra 命令（当其他工具无法满足需求时使用）',
      schema: z.object({
        command: z.string().describe('GeoGebra 命令（例如："A = (1, 2)", "Integral(f, 0, 2)"）'),
      }),
    }
  ),
];

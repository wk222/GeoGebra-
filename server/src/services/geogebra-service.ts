import logger from '../utils/logger';
import { ToolCall } from '../types';
import { GeoGebraInstance } from '../utils/geogebra-instance';
import { GeoGebraConfig } from '../types/geogebra';

// GeoGebra 服务 - 支持服务器端和客户端模式
export class GeoGebraService {
  private instance: GeoGebraInstance | null = null;
  private isInitialized = false;
  private useServerInstance = false; // 默认使用客户端模式

  constructor(config?: { useServerInstance?: boolean }) {
    this.useServerInstance = config?.useServerInstance || false;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (this.useServerInstance) {
        // 服务器端模式：使用 Puppeteer 初始化 GeoGebra 实例
        const instanceConfig: GeoGebraConfig = {
          appName: 'classic',
          width: 800,
          height: 600,
          showMenuBar: false,
          showToolBar: false,
          showAlgebraInput: false
        };
        
        this.instance = new GeoGebraInstance(instanceConfig);
        await this.instance.initialize(true); // headless mode
        logger.info('GeoGebra 服务器实例初始化成功');
      } else {
        // 客户端模式：只生成命令，不实际执行
        logger.info('GeoGebra 客户端模式初始化成功');
      }
      
      this.isInitialized = true;
    } catch (error) {
      logger.error('GeoGebra 服务初始化失败', error);
      throw error;
    }
  }

  async executeTool(toolCall: ToolCall): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { tool, parameters } = toolCall;
      logger.info(`${this.useServerInstance ? '执行' : '生成'}工具命令: ${tool}`, parameters);

      switch (tool) {
        case 'geogebra_create_point':
          return await this.createPoint(parameters as any);
        case 'geogebra_create_line':
          return await this.createLine(parameters as any);
        case 'geogebra_create_circle':
          return await this.createCircle(parameters as any);
        case 'geogebra_plot_function':
          return await this.plotFunction(parameters as any);
        case 'geogebra_create_polygon':
          return await this.createPolygon(parameters as any);
        case 'geogebra_plot_integral':
          return await this.plotIntegral(parameters as any);
        case 'geogebra_clear_construction':
          return await this.clearConstruction();
        case 'geogebra_eval_command':
          return await this.evalCommand(parameters as any);
        default:
          throw new Error(`未知的工具: ${tool}`);
      }
    } catch (error) {
      logger.error(`工具执行失败: ${toolCall.tool}`, error);
      throw error;
    }
  }

  private async createPoint(params: { name: string; x: number; y: number }) {
    const command = `${params.name} = (${params.x}, ${params.y})`;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, point: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  private async createLine(params: { name: string; point1: string; point2: string }) {
    const command = `${params.name} = Line(${params.point1}, ${params.point2})`;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, line: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  private async createCircle(params: { name: string; center: string; radius: number }) {
    const command = `${params.name} = Circle(${params.center}, ${params.radius})`;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, circle: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  private async plotFunction(params: { name: string; expression: string; xMin?: number; xMax?: number }) {
    let command: string;
    
    if (params.xMin !== undefined && params.xMax !== undefined) {
      command = `${params.name}(x) = If(${params.xMin} <= x <= ${params.xMax}, ${params.expression}, ?)`;
    } else {
      command = `${params.name}(x) = ${params.expression}`;
    }
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, function: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  private async createPolygon(params: { name: string; vertices: string[] }) {
    const verticesStr = params.vertices.join(', ');
    const command = `${params.name} = Polygon(${verticesStr})`;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, polygon: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  private async plotIntegral(params: { name: string; functionName: string; lowerBound: number; upperBound: number }) {
    const command = `${params.name} = Integral(${params.functionName}, ${params.lowerBound}, ${params.upperBound})`;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      if (result.success) {
        const info = await this.instance.getObjectInfo(params.name);
        return { success: true, command, integral: info };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true, command };
  }

  async clearConstruction() {
    const command = 'Delete(*)';

    if (this.useServerInstance && this.instance) {
      await this.instance.newConstruction();
      return { success: true, command, message: '画布已清空' };
    }

    return { success: true, command };
  }

  private async evalCommand(params: { command: string }) {
    const command = params.command;
    
    if (this.useServerInstance && this.instance) {
      const result = await this.instance.evalCommand(command);
      return { success: result.success, command, result: result.result, error: result.error };
    }
    
    return { success: true, command };
  }

  async exportPNG(): Promise<string> {
    if (this.useServerInstance && this.instance) {
      return await this.instance.exportPNG();
    }
    throw new Error('导出PNG功能需要在客户端执行或启用服务器端实例');
  }

  async getAllObjects(): Promise<any[]> {
    if (this.useServerInstance && this.instance) {
      const objectNames = await this.instance.getAllObjectNames();
      const objects = [];
      for (const name of objectNames) {
        const info = await this.instance.getObjectInfo(name);
        if (info) {
          objects.push(info);
        }
      }
      return objects;
    }
    return [];
  }

  async cleanup(): Promise<void> {
    if (this.instance) {
      await this.instance.cleanup();
      this.instance = null;
    }
    this.isInitialized = false;
    logger.info('GeoGebra 服务清理完成');
  }
  
  getMode(): 'server' | 'client' {
    return this.useServerInstance ? 'server' : 'client';
  }
}

// 全局单例
export const geogebraService = new GeoGebraService();


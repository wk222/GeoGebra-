// GeoGebra 工具定义（使用标准 JSON Schema）
export const geogebraTools = [
  {
    name: 'geogebra_create_point',
    description: '在 GeoGebra 中创建一个点',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '点的名称（例如："A", "P1"）' },
        x: { type: 'number', description: '点的 X 坐标' },
        y: { type: 'number', description: '点的 Y 坐标' },
      },
      required: ['name', 'x', 'y'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_create_line',
    description: '在 GeoGebra 中创建一条直线',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '直线的名称' },
        point1: { type: 'string', description: '第一个点的名称' },
        point2: { type: 'string', description: '第二个点的名称' },
      },
      required: ['name', 'point1', 'point2'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_create_circle',
    description: '在 GeoGebra 中创建一个圆',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '圆的名称' },
        center: { type: 'string', description: '圆心的名称' },
        radius: { type: 'number', description: '圆的半径' },
      },
      required: ['name', 'center', 'radius'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_plot_function',
    description: '绘制数学函数',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '函数的名称（例如："f", "g"）' },
        expression: { type: 'string', description: '函数表达式（例如："x^2", "sin(x)"）' },
        xMin: { type: 'number', description: '定义域最小值（可选）' },
        xMax: { type: 'number', description: '定义域最大值（可选）' },
        color: { type: 'string', description: '函数颜色（可选）' },
      },
      required: ['name', 'expression'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_create_polygon',
    description: '创建多边形',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '多边形的名称' },
        vertices: { 
          type: 'array',
          items: { type: 'string' },
          description: '顶点名称数组',
        },
      },
      required: ['name', 'vertices'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_clear_construction',
    description: '清除所有 GeoGebra 构造',
    parameters: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_plot_integral',
    description: '绘制定积分的可视化图形（在函数和x轴之间填充阴影面积）。用于展示积分的几何意义。必须先定义函数，然后再调用此工具。',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '积分对象的名称' },
        functionName: { type: 'string', description: '要积分的函数名称（需要先定义函数）' },
        lowerBound: { type: 'number', description: '积分下限' },
        upperBound: { type: 'number', description: '积分上限' },
      },
      required: ['name', 'functionName', 'lowerBound', 'upperBound'],
      additionalProperties: false,
    },
  },
  {
    name: 'geogebra_eval_command',
    description: '执行自定义 GeoGebra 命令（当其他工具无法满足需求时使用）',
    parameters: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'GeoGebra 命令（例如："A = (1, 2)", "Integral(f, 0, 2)"）' },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },
];

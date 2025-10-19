# LaTeX 渲染 + 练习题可视化改进总结

## ✅ 已完成的两个重大改进

### 1. 📐 LaTeX 数学公式渲染支持

#### 问题
- AI 生成的数学公式（如 `\( x^2 \)`, `\[ \frac{a}{b} \]`）无法正确显示
- 用户只能看到原始 LaTeX 代码

#### 解决方案
引入 **react-markdown** + **remark-math** + **rehype-katex** 库栈

#### 技术实现

**安装的包：**
```json
{
  "katex": "^0.16.x",
  "react-katex": "^3.x",
  "react-markdown": "^9.x",
  "remark-math": "^6.x",
  "rehype-katex": "^7.x"
}
```

**MessageItem.tsx 改进：**
```typescript
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// AI 消息渲染
<ReactMarkdown
  remarkPlugins={[remarkMath]}
  rehypePlugins={[rehypeKatex]}
  components={{
    // 自定义样式...
  }}
>
  {message.content}
</ReactMarkdown>
```

#### 支持的 LaTeX 格式

**行内公式：**
- `$x^2 + 2x + 1$`
- `\( ax^2 + bx + c \)`

**独立公式：**
```latex
$$
f(x) = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

或

```latex
\[
\int_0^1 x^2 \, dx = \frac{1}{3}
\]
```

#### 额外支持的 Markdown 特性
- **代码块** - 语法高亮
- **列表** - 有序/无序
- **标题** - H1/H2/H3
- **details/summary** - 可折叠内容（完美适合练习题答案）

---

### 2. 📊 练习题生成器 + GeoGebra 自动可视化

#### 问题
- 练习题生成器只能生成文本题目
- 函数、几何等题目缺少可视化图像
- 学生难以直观理解题意

#### 解决方案
**将练习题生成器升级为支持工具调用的智能体**

#### 技术实现

**关键改动：**

1. **添加 GeoGebra 工具支持**
```typescript
export class ExerciseGeneratorAgent extends Agent {
  getTools() {
    return geogebraTools;  // 支持7个 GeoGebra 工具
  }
}
```

2. **实现手动工具调用循环**
```typescript
// 绑定工具
const modelWithTools = this.model.bindTools(
  geogebraTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.schema,
  }))
);

// 手动循环（最多5轮）
while (iterations < maxIterations) {
  const response = await modelWithTools.invoke(currentMessages);
  
  if (response.tool_calls && response.tool_calls.length > 0) {
    // 执行工具
    for (const toolCall of response.tool_calls) {
      const tool = geogebraTools.find(t => t.name === toolCall.name);
      const result = await tool.execute(toolCall.args);
      
      // 添加工具消息
      currentMessages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: [toolCall],
      } as any);

      currentMessages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      } as any);
    }
    iterations++;
    continue;
  }
  
  // 返回最终答案
  return { message: response, toolCalls: allToolCalls };
}
```

3. **优化系统提示词**
```
何时调用 GeoGebra 工具（必须遵守）：

### 必须调用的情况：
1. **二次函数题目** → 调用 geogebra_plot_function 绘制抛物线
2. **一次函数题目** → 调用 geogebra_plot_function 绘制直线
3. **三角函数题目** → 调用 geogebra_plot_function 绘制 sin/cos
4. **几何图形题目** → 调用相应工具绘制点、线、圆
5. **积分相关题目** → 调用 geogebra_plot_integral 绘制阴影

### 调用时机：
- 在生成题目**之前**先调用工具
- 题目中提到具体函数表达式时必须可视化
```

#### 使用示例

**用户请求：**
> "生成3道二次函数的中等难度题"

**AI 行为：**
1. **第1轮**：调用 `geogebra_plot_function("f1", "x^2-4*x+3")`
2. **第2轮**：调用 `geogebra_plot_function("f2", "-x^2+6*x-5")`
3. **第3轮**：调用 `geogebra_plot_function("f3", "2*x^2-3*x+1")`
4. **第4轮**：生成题目文本（包含 LaTeX 公式）

**最终效果：**
- 左侧：Markdown + LaTeX 渲染的题目
- 右侧：GeoGebra 画板显示3个函数图像
- 学生可以直观看到函数形状、顶点、对称轴等

---

## 🎯 完整工作流程

### 示例：生成二次函数练习题

**1. 用户请求**
```
用户：生成2道二次函数的题目
```

**2. AI 调用工具（自动）**
```
工具调用 1: geogebra_plot_function
  参数: { name: "f", expression: "x^2-4*x+3" }
  结果: success
```

**3. AI 生成题目（LaTeX + Markdown）**
```markdown
## 📋 练习题集 - 二次函数

### 难度：⭐⭐ 中等

> 📊 **可视化图像**：请查看右侧 GeoGebra 画板

---

### 题目 1：选择题

**问题：**  
已知二次函数 $y = x^2 - 4x + 3$，则它的顶点坐标是：

**选项：**  
A. $(2, -1)$  
B. $(2, -4)$  
C. $(-2, -1)$  
D. $(1, -2)$

<details>
<summary>💡 点击查看答案</summary>

**答案：** A

**详细解析：**
1. 顶点横坐标：$x = -\frac{b}{2a} = -\frac{-4}{2} = 2$
2. 代入得：$y = (2)^2 - 4(2) + 3 = -1$
3. 顶点坐标为 $(2, -1)$

**知识点：** 二次函数顶点坐标求法  
**易错点：** 忘记公式中的负号

</details>
```

**4. 前端渲染**
- Markdown 渲染器处理格式
- KaTeX 渲染数学公式 $x^2$, $(2, -1)$ 等
- GeoGebra 画板显示函数图像
- Details 标签实现答案折叠

---

## 📚 技术要点总结

### LaTeX 渲染
- **库栈**: react-markdown → remark-math → rehype-katex
- **CSS**: 必须引入 `katex/dist/katex.min.css`
- **兼容性**: 支持 `$...$` 和 `\(...\)` 两种语法

### 工具调用循环
- **模式**: 手动循环（LangChain 1.0 推荐）
- **方法**: `model.bindTools(tools)`
- **检查**: `response.tool_calls`
- **执行**: 调用 `tool.execute(args)`
- **消息**: 添加 `{ role: 'tool', content, tool_call_id }` 继续对话

### 智能体架构
- **base class**: `Agent` (定义在 `types/agent.ts`)
- **核心方法**: `chat(messages, aiConfig): Promise<ChatResponse>`
- **工具支持**: `getTools(): AgentTool[]`
- **配置**: `getConfig(): AgentConfig`

---

## 🔬 对比：改进前 vs 改进后

| 特性 | 改进前 | 改进后 |
|------|--------|--------|
| **数学公式** | 原始 LaTeX 代码 | ✅ 美观的数学公式渲染 |
| **Markdown** | 纯文本 | ✅ 完整 Markdown 支持 |
| **练习题可视化** | ❌ 无图像 | ✅ 自动 GeoGebra 配图 |
| **答案折叠** | ❌ 不支持 | ✅ details/summary 标签 |
| **函数图像** | 需手动切换智能体 | ✅ 练习题智能体自动绘图 |
| **学习体验** | 文字为主 | ✅ 图文并茂，直观易懂 |

---

## 🚀 未来可能的改进

### 1. 交互式可视化
- 让学生可以在 GeoGebra 画板上拖动点
- 观察函数图像的变化
- 探索数学概念

### 2. 错题本集成
- 记录学生做错的题目
- 自动生成相似题目
- 配合可视化加深理解

### 3. 难度自适应
- 根据学生答题正确率
- 动态调整题目难度
- 智能推荐练习内容

### 4. 多模态输入
- 支持学生手写公式（OCR）
- 识别并自动可视化
- 提供即时反馈

---

## 📖 开发者指南

### 如何添加新的可视化工具

**步骤 1：定义工具**
```typescript
// server/src/services/new-tools.ts
export const newTools = [
  {
    name: 'new_tool',
    description: '工具描述',
    schema: { /* Zod schema */ },
    execute: async (params) => { /* 实现 */ }
  }
];
```

**步骤 2：在智能体中引用**
```typescript
import { newTools } from '../services/new-tools';

export class MyAgent extends Agent {
  getTools() {
    return [...geogebraTools, ...newTools];
  }
}
```

**步骤 3：更新系统提示词**
告诉 AI 何时调用新工具。

---

## ✅ 测试清单

- [x] LaTeX 行内公式渲染正确
- [x] LaTeX 独立公式居中显示
- [x] Markdown 标题、列表正确解析
- [x] 代码块语法高亮
- [x] details/summary 折叠功能
- [x] 练习题智能体自动调用 GeoGebra 工具
- [x] 工具调用循环正确执行
- [x] 多个函数可同时绘制
- [x] GeoGebra 画板仅在相关智能体显示
- [x] 练习题智能体切换时画板正确显示/隐藏

---

**总结**：
通过引入 LaTeX 渲染和智能工具调用，数学教学系统的用户体验得到显著提升。学生现在可以：
1. 看到美观的数学公式（不是代码）
2. 自动获得配套的可视化图像
3. 通过折叠答案自主学习

这两个改进完美契合了初高中数学教学的实际需求！ 🎓

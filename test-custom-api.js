// 测试自定义API配置功能
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testCustomAPI() {
  console.log('🧪 测试自定义API配置功能...\n');

  try {
    // 测试1: 验证自定义API配置
    console.log('1. 测试验证自定义API配置...');
    const validateResponse = await axios.post(`${BASE_URL}/config/validate`, {
      provider: 'custom',
      apiKey: 'sk-HyDIjXAgkLOlGZjFesZ7T31malntKZUmDwaFDfeMhOk1FQvl',
      baseURL: 'http://185.183.98.135:3000/v1'
    });
    
    console.log('✅ 验证结果:', validateResponse.data);
    
    // 测试2: 获取自定义API的模型列表
    console.log('\n2. 测试获取自定义API模型列表...');
    const modelsResponse = await axios.get(`${BASE_URL}/config/models/custom`);
    
    console.log('✅ 模型列表:', modelsResponse.data);
    
    // 测试3: 测试聊天功能（如果服务器支持）
    console.log('\n3. 测试聊天功能...');
    const chatResponse = await axios.post(`${BASE_URL}/chat/message`, {
      messages: [
        {
          id: 'test-1',
          role: 'user',
          content: '你好，请画一个圆',
          timestamp: new Date()
        }
      ],
      config: {
        provider: 'custom',
        apiKey: 'sk-HyDIjXAgkLOlGZjFesZ7T31malntKZUmDwaFDfeMhOk1FQvl',
        model: 'gpt-5-chat',
        baseURL: 'http://185.183.98.135:3000/v1'
      },
      sessionId: 'test-session'
    });
    
    console.log('✅ 聊天响应:', chatResponse.data);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCustomAPI();
const fs = require('fs');
const path = require('path');
const officegen = require('officegen');

// 使用 data2 目录
const dataDir = path.resolve(__dirname, '../data2');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createDoc(filename, title, paragraphs) {
  return new Promise((resolve, reject) => {
    const docx = officegen('docx');
    docx.on('error', (err) => {
      console.error(`Error in officegen: ${err.message}`);
      reject(err);
    });

    // 标题
    const pObjTitle = docx.createP();
    pObjTitle.addText(title, { bold: true, font_size: 18 });
    pObjTitle.options.align = 'center';

    // 内容
    paragraphs.forEach(text => {
      const pObj = docx.createP();
      pObj.addText(text, { font_size: 12 });
    });

    const filePath = path.join(dataDir, filename);
    const out = fs.createWriteStream(filePath);
    out.on('error', (err) => {
      console.error(`Error in writestream: ${err.message}`);
      reject(err);
    });
    out.on('close', () => {
      console.log(`Created: ${filename}`);
      resolve(filePath);
    });
    docx.generate(out);
  });
}

const topics = [
  "市场调研", "技术方案", "财务审计", "安全巡检", "质量控制",
  "项目验收", "行业分析", "员工考核", "战略规划", "系统部署",
  "运维日志", "资产管理", "风险评估", "培训总结", "产品设计"
];

const contentTemplates = [
  "根据初步调研显示，该领域的增长潜力巨大，预计在未来三个季度内将实现翻倍增长。本报告对竞争对手进行了深度剖析。",
  "经过技术团队的联合攻关，目前核心模块的稳定性已经达到99.99%。本报告记录了压力测试的所有详细参数。",
  "在本次审查过程中，我们发现了一些流程上的小瑕疵，但整体内控体系是非常完备的。本报告建议在下季度对库存盘点逻辑进行微调。",
  "局域网环境下的安全隐患仍然不容忽视，尤其是针对内网横向移动的防护需要加强。本报告详细列出了所有待修复的高危漏洞。",
  "由于原材料价格波动，本月成本略有上升。本报告分析了供应链优化的三种可能路径。"
];

async function run() {
  console.log(`Generating 50 random documents in ${dataDir} ...`);
  console.log('This may take a minute...');
  
  for (let i = 1; i <= 50; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const filename = `${topic}_测试数据_${i}_报告.docx`;
    const title = `${topic}详细调研与分析报告 - 编号 ${i}`;
    
    // 生成长文本
    const paragraphs = [];
    const numParas = 15 + Math.floor(Math.random() * 10); // 15-25 个段落
    for (let j = 0; j < numParas; j++) {
      const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];
      paragraphs.push(`[段落 ${j+1}] ${template} 我们需要密切关注此项报告中的数据趋势。`);
    }
    
    await createDoc(filename, title, paragraphs);
  }
  
  console.log('\n--- 50个测试文档已全部生成完毕！ ---');
  console.log(`位置: ${dataDir}`);
}

run().catch(err => {
  console.error("生成失败:", err);
});

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, 
  Layers, 
  Search, 
  Database, 
  RefreshCw, 
  Info, 
  ArrowRight, 
  ChevronRight, 
  Filter,
  Maximize2
} from 'lucide-react';

// --- 1. 数据定义 (Mock Data) ---

// 文档库
const DOCUMENTS = [
  {
    id: 'doc_1',
    title: '员工手册 - 年假与报销',
    category: 'hr',
    content: `第一章：假期管理
1.1 年假制度
员工入职满一年后，享有5天带薪年假。年假需提前3个工作日通过OA系统申请。
未使用的年假将在年底清零，特殊情况可申请延期至次年3月。
1.2 病假与事假
病假需提供二级以上医院证明。事假期间不发薪资。

第二章：财务报销
2.1 差旅费
差旅住宿标准：一线城市500元/天，二线城市350元/天。
餐饮补贴：全天80元。
2.2 报销流程
所有发票需粘贴在A4纸上，经部门负责人签字后提交财务部。每月25日统一打款。`
  },
  {
    id: 'doc_2',
    title: 'ISO27001 信息安全管理规范',
    category: 'iso',
    content: `1. 访问控制策略
所有核心服务器必须开启双因素认证(2FA)。密码强度要求：至少12位，包含大小写字母及特殊符号。
每90天必须强制更改一次密码。

2. 数据备份
关键业务数据需实行每日增量备份，每周全量备份。
备份数据应异地存储，且每年进行一次恢复演练。

3. 物理安全
机房进出需刷卡并登记。外来人员必须由内部员工全程陪同。
严禁在机房内进食或饮水。`
  },
  {
    id: 'doc_3',
    title: '打印机设备维护说明',
    category: 'device',
    content: `故障排除指南：
1. 卡纸处理
打开前盖，轻轻拉出硒鼓单元。如有卡纸，请沿出纸方向双手慢慢拉出。
切勿强行拉扯，以免损坏定影组件。

2. 更换墨粉
当屏幕显示"Toner Low"时，请准备新墨粉盒。
摇晃新墨粉盒5-6次，使其分布均匀，然后装入硒鼓单元。

3. 网络连接
长按WiFi键3秒直至闪烁，使用手机APP配置网络。
默认管理密码为机身背部序列号后6位。`
  }
];

// 向量直觉 Lab 的预设点位 (模拟 Embedding 降维后的 2D 坐标)
// 坐标范围: x: 0-100, y: 0-100
const VECTOR_POINTS = [
  { id: 'v1', label: '年假申请规则', x: 20, y: 80, category: 'hr', docTitle: '员工手册' },
  { id: 'v2', label: '病假医院证明', x: 25, y: 75, category: 'hr', docTitle: '员工手册' },
  { id: 'v3', label: '差旅报销标准', x: 30, y: 30, category: 'finance', docTitle: '员工手册' },
  { id: 'v4', label: '发票粘贴流程', x: 35, y: 25, category: 'finance', docTitle: '员工手册' },
  { id: 'v5', label: '服务器双因素认证', x: 80, y: 80, category: 'security', docTitle: 'ISO规范' },
  { id: 'v6', label: '密码强度策略', x: 85, y: 85, category: 'security', docTitle: 'ISO规范' },
  { id: 'v7', label: '机房物理安全', x: 80, y: 70, category: 'security', docTitle: 'ISO规范' },
  { id: 'v8', label: '打印机卡纸', x: 80, y: 20, category: 'device', docTitle: '设备说明' },
  { id: 'v9', label: '更换墨粉盒', x: 85, y: 25, category: 'device', docTitle: '设备说明' },
];

// 混合检索用的简化索引 (用于 Hybrid Lab)
const HYBRID_INDEX = [
  { id: 'h1', text: '员工年假需提前3天申请，满一年享5天。', keywords: ['年假', '申请', '5天'], vecCategory: 'hr', docId: 'doc_1' },
  { id: 'h2', text: '差旅报销一线城市500元，餐饮补80。', keywords: ['报销', '差旅', '500元', '一线城市'], vecCategory: 'finance', docId: 'doc_1' },
  { id: 'h3', text: '信息安全管理体系(ISMS)认证要求双因素认证。', keywords: ['信息安全', 'ISMS', '双因素', '认证'], vecCategory: 'security', docId: 'doc_2' },
  { id: 'h4', text: '每90天强制更改密码，长度至少12位。', keywords: ['密码', '90天', '12位'], vecCategory: 'security', docId: 'doc_2' },
  { id: 'h5', text: '打印机卡纸请沿出纸方向拉出。', keywords: ['打印机', '卡纸', '故障'], vecCategory: 'device', docId: 'doc_3' },
];

// --- 2. 辅助函数 ---

// 简单的分块模拟器
const simulateChunking = (text, size, overlap, strategy) => {
  const chunks = [];
  const len = text.length;
  
  if (strategy === 'paragraph') {
    // 简单按换行符分块
    const paras = text.split('\n').filter(p => p.trim().length > 0);
    let currentOffset = 0;
    paras.forEach((p, idx) => {
      chunks.push({
        id: `chunk_${idx}`,
        content: p,
        start: text.indexOf(p, currentOffset),
        end: text.indexOf(p, currentOffset) + p.length,
        type: p.length < 20 ? 'heading' : 'paragraph'
      });
      currentOffset = text.indexOf(p, currentOffset) + p.length;
    });
  } else {
    // 固定窗口 + Overlap
    let start = 0;
    let idx = 0;
    while (start < len) {
      let end = Math.min(start + size, len);
      // 尽量不在单词中间切断 (简单优化)
      if (end < len && text[end] !== '\n' && text[end] !== ' ') {
        const nextSpace = text.indexOf(' ', end);
        const nextBreak = text.indexOf('\n', end);
        if (nextSpace !== -1 && nextSpace - end < 20) end = nextSpace; 
        else if (nextBreak !== -1 && nextBreak - end < 20) end = nextBreak;
      }

      chunks.push({
        id: `chunk_${idx}`,
        content: text.slice(start, end),
        start: start,
        end: end,
        type: 'window'
      });
      
      if (end >= len) break;
      start += (size - overlap); // 步进 = 窗口 - 重叠
      idx++;
    }
  }
  return chunks;
};

// 简单的向量距离模拟 (Euclidean)
const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// --- 3. 主应用组件 ---

const RAGPlayground = () => {
  const [activeTab, setActiveTab] = useState('chunking');
  const [selectedDocId, setSelectedDocId] = useState('doc_1');
  const selectedDoc = DOCUMENTS.find(d => d.id === selectedDocId) || DOCUMENTS[0];

  // Tab 1 State
  const [chunkSize, setChunkSize] = useState(150);
  const [overlap, setOverlap] = useState(30);
  const [strategy, setStrategy] = useState('fixed'); // fixed | paragraph
  const [highlightedChunkId, setHighlightedChunkId] = useState(null);

  // Tab 2 State
  const [vectorQuery, setVectorQuery] = useState('');
  const [queryPoint, setQueryPoint] = useState({ x: 50, y: 50 }); // Default center

  // Tab 3 State
  const [hybridQuery, setHybridQuery] = useState('ISO27001');
  const [searchMode, setSearchMode] = useState('hybrid'); // vector | keyword | hybrid
  const [useAlias, setUseAlias] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // --- Tab 1 Logic: Chunking ---
  const chunks = useMemo(() => {
    return simulateChunking(selectedDoc.content, chunkSize, overlap, strategy);
  }, [selectedDoc, chunkSize, overlap, strategy]);

  // --- Tab 2 Logic: Vector Intuition ---
  const updateQueryPosition = (q) => {
    setVectorQuery(q);
    // Hardcoded logic to move the "Query Point" based on keywords to simulate embedding model
    let target = { x: 50, y: 50 }; // default
    if (q.includes('年假') || q.includes('请假')) target = { x: 22, y: 78 };
    else if (q.includes('报销') || q.includes('钱')) target = { x: 32, y: 28 };
    else if (q.includes('安全') || q.includes('ISO') || q.includes('密码')) target = { x: 82, y: 78 };
    else if (q.includes('打印') || q.includes('坏了')) target = { x: 82, y: 22 };
    setQueryPoint(target);
  };

  const vectorResults = useMemo(() => {
    const results = VECTOR_POINTS.map(p => ({
      ...p,
      distance: getDistance(queryPoint, p)
    }));
    return results.sort((a, b) => a.distance - b.distance).slice(0, 3);
  }, [queryPoint]);

  // --- Tab 3 Logic: Hybrid Search ---
  const hybridResults = useMemo(() => {
    // 1. Mock Vector Score (Based on category closeness)
    // 2. Mock Keyword Score (Simple includes)
    // 3. Combine
    
    // Determine user intent category roughly
    let intentCategory = 'other';
    const qLower = hybridQuery.toLowerCase();
    if (qLower.includes('年假') || qLower.includes('报销')) intentCategory = 'hr_finance';
    if (qLower.includes('iso') || qLower.includes('安全') || qLower.includes('认证')) intentCategory = 'security';
    if (qLower.includes('打印')) intentCategory = 'device';

    return HYBRID_INDEX.map(item => {
      // A. Vector Score (Mocked by category match)
      let vecScore = 0.5; // base noise
      if (intentCategory === 'hr_finance' && (item.vecCategory === 'hr' || item.vecCategory === 'finance')) vecScore = 0.85 + Math.random() * 0.1;
      if (intentCategory === 'security' && item.vecCategory === 'security') vecScore = 0.88 + Math.random() * 0.1;
      if (intentCategory === 'device' && item.vecCategory === 'device') vecScore = 0.9 + Math.random() * 0.1;

      // B. Keyword Score (BM25 simplified)
      let kwScore = 0;
      let matchedTerms = [];
      
      // Basic match
      if (item.text.toLowerCase().includes(qLower)) {
        kwScore += 0.8;
        matchedTerms.push(hybridQuery);
      }
      
      // Advanced Alias Logic (The key teaching point!)
      if (useAlias && qLower === 'iso27001' && item.text.includes('ISMS')) {
         kwScore += 0.9; // Boost for alias
         matchedTerms.push('ISMS(Alias)');
      }
      
      // Cap scores
      kwScore = Math.min(kwScore, 1.0);

      // C. Filter Logic
      if (categoryFilter !== 'all' && item.vecCategory !== categoryFilter) {
        return null; // filtered out
      }

      // D. Final Hybrid Score
      // Weights: 0.5 vec + 0.5 kw (simplified)
      let finalScore = 0;
      if (searchMode === 'vector') finalScore = vecScore;
      else if (searchMode === 'keyword') finalScore = kwScore;
      else finalScore = (vecScore * 0.4) + (kwScore * 0.6); // keyword slightly heavier

      return {
        ...item,
        vecScore: vecScore.toFixed(3),
        kwScore: kwScore.toFixed(3),
        hybridScore: finalScore.toFixed(3),
        matchedTerms
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.hybridScore - a.hybridScore);
  }, [hybridQuery, searchMode, useAlias, categoryFilter]);


  // --- Render Components ---

  const renderHeader = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Layers className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">RAG 交互实验台</h1>
          <p className="text-xs text-gray-500">For PMs & Java Engineers</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">示例文档:</span>
          <select 
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="border-gray-300 border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {DOCUMENTS.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.title}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => {
            setChunkSize(150);
            setOverlap(30);
            setStrategy('fixed');
            setSearchMode('hybrid');
            setUseAlias(false);
            setCategoryFilter('all');
            setVectorQuery('');
            setQueryPoint({x:50, y:50});
          }}
          className="text-gray-500 hover:text-blue-600 transition-colors"
          title="重置所有参数"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex justify-center bg-gray-50 pt-4">
      <div className="flex space-x-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
        {[
          { id: 'chunking', label: '1. Chunking Lab', icon: Database },
          { id: 'vector', label: '2. Vector Intuition', icon: Maximize2 },
          { id: 'hybrid', label: '3. Hybrid Search', icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-blue-100 text-blue-700 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // --- Tab 1: Chunking Lab Content ---
  const ChunkingLab = () => (
    <div className="grid grid-cols-12 gap-6 h-full p-6">
      {/* 左侧：原文可视化 */}
      <div className="col-span-6 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-700 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            原始文本视图
          </h3>
        </div>
        <div className="p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed relative font-mono text-sm text-gray-800">
          {/* 这里使用一个简单的 trick：当 hover 某个 chunk 时，只显示该 chunk 的高亮 */}
          {selectedDoc.content}
          
          {highlightedChunkId && (() => {
            const chunk = chunks.find(c => c.id === highlightedChunkId);
            if (!chunk) return null;
            // 简单的 overlay 定位 (实际项目中可能需要更复杂的range计算，这里简化为只在下方显示高亮文本)
            // 为了简化 Demo，我们不在原文本上做复杂的 DOM Range 高亮，
            // 而是如果 Highlighted，我们在底部弹出一个 Panel 显示内容
            return null;
          })()}
        </div>
        {highlightedChunkId && (
          <div className="bg-yellow-50 border-t border-yellow-200 p-3 text-sm text-yellow-800 animate-in slide-in-from-bottom-2 fade-in">
            <strong>当前高亮 Chunk:</strong> {chunks.find(c => c.id === highlightedChunkId)?.content}
          </div>
        )}
      </div>

      {/* 右侧：控制与列表 */}
      <div className="col-span-6 flex flex-col gap-6 h-[calc(100vh-220px)]">
        {/* 控制面板 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">分块参数 (Parameters)</h3>
          
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">分块策略 (Strategy)</label>
              <select 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 w-48"
              >
                <option value="fixed">Fixed Size (固定长度)</option>
                <option value="paragraph">Paragraph (按段落)</option>
              </select>
            </div>

            {strategy === 'fixed' && (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-600">Chunk Size (字符数)</label>
                    <span className="text-sm font-bold text-blue-600">{chunkSize} char</span>
                  </div>
                  <input 
                    type="range" min="50" max="500" step="10" 
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-600">Overlap (重叠)</label>
                    <span className="text-sm font-bold text-green-600">{overlap} char</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5" 
                    value={overlap}
                    onChange={(e) => setOverlap(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">Overlap 能够保留上下文连贯性，避免语义被切断。</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 结果列表 */}
        <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-gray-700">Chunk List ({chunks.length})</h3>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Click to inspect</span>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Preview (Start-End)</th>
                  <th className="px-4 py-2">Length</th>
                </tr>
              </thead>
              <tbody>
                {chunks.map((chunk) => (
                  <tr 
                    key={chunk.id}
                    onMouseEnter={() => setHighlightedChunkId(chunk.id)}
                    onMouseLeave={() => setHighlightedChunkId(null)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      highlightedChunkId === chunk.id ? 'bg-yellow-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{chunk.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 truncate w-64">{chunk.content}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Pos: {chunk.start} - {chunk.end}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{chunk.content.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Tab 2: Vector Intuition Content ---
  const VectorLab = () => (
    <div className="grid grid-cols-12 gap-6 h-full p-6">
      {/* Left: 2D Chart */}
      <div className="col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Embedding Space (2D Projection)</h3>
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Mock PCA View</div>
        </div>
        <div className="relative flex-1 bg-slate-50 overflow-hidden m-4 rounded-lg border border-slate-200">
          {/* Coordinate System */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />
            
            {/* Connection Lines (Top K) */}
            {vectorResults.map((p, i) => (
              <line 
                key={`line-${p.id}`}
                x1={queryPoint.x} y1={queryPoint.y}
                x2={p.x} y2={p.y}
                stroke="#60a5fa"
                strokeWidth={0.5}
                strokeDasharray="2,2"
                opacity={0.6}
              />
            ))}

            {/* Document Points */}
            {VECTOR_POINTS.map(p => (
              <g key={p.id}>
                <circle 
                  cx={p.x} cy={p.y} r="2" 
                  fill={p.category === 'hr' ? '#10b981' : p.category === 'finance' ? '#f59e0b' : p.category === 'security' ? '#ef4444' : '#6366f1'} 
                  className="cursor-pointer hover:r-3 transition-all"
                />
                <text x={p.x + 3} y={p.y + 1} fontSize="3" fill="#64748b" className="select-none pointer-events-none opacity-60">
                  {p.label}
                </text>
              </g>
            ))}

            {/* Query Point */}
            <g className="transition-all duration-500 ease-in-out" style={{transformOrigin: `${queryPoint.x}px ${queryPoint.y}px`}}>
               <circle cx={queryPoint.x} cy={queryPoint.y} r="3" fill="#3b82f6" stroke="white" strokeWidth="0.8" />
               <text x={queryPoint.x - 2} y={queryPoint.y - 4} fontSize="3" fontWeight="bold" fill="#3b82f6">Q</text>
            </g>
          </svg>
          
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 p-1 rounded">
            Distance = Euclidean
          </div>
        </div>
        <div className="px-6 pb-4 flex gap-4 text-xs text-gray-600">
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div>HR</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>Finance</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>Security</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>Device</div>
        </div>
      </div>

      {/* Right: Controls & Top K */}
      <div className="col-span-5 flex flex-col gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <label className="text-sm font-bold text-gray-700 block mb-3">输入 Query 模拟向量化</label>
          <div className="flex gap-2 mb-4">
             <input 
               type="text" 
               value={vectorQuery}
               readOnly
               placeholder="点击下方按钮试一试..."
               className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
             />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "年假怎么休", "发票怎么报销", "ISO27001密码要求", "打印机坏了"
            ].map(q => (
              <button 
                key={q}
                onClick={() => updateQueryPosition(q)}
                className="px-3 py-2 text-xs bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 rounded transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 p-5">
           <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-between">
             <span>Top 3 Nearest Neighbors</span>
             <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Vector Search</span>
           </h3>
           <div className="space-y-3">
             {vectorResults.map((res, idx) => (
               <div key={res.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                 <div className="flex items-center space-x-3">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                     idx === 0 ? 'bg-amber-500' : 'bg-gray-400'
                   }`}>
                     {idx + 1}
                   </div>
                   <div>
                     <div className="text-sm font-medium text-gray-800">{res.label}</div>
                     <div className="text-xs text-gray-500">Doc: {res.docTitle}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-xs font-mono text-blue-600 font-bold">{(1 - (res.distance / 100)).toFixed(4)}</div>
                   <div className="text-[10px] text-gray-400">Sim Score</div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );

  // --- Tab 3: Hybrid Search Content ---
  const HybridLab = () => (
    <div className="flex flex-col h-full bg-gray-50 p-6 gap-6 overflow-y-auto">
      {/* 1. Search Bar Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <div className="flex flex-col md:flex-row md:items-end gap-6">
           <div className="flex-1">
             <label className="block text-sm font-medium text-gray-700 mb-2">Search Query</label>
             <div className="relative">
               <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
               <input 
                  type="text"
                  value={hybridQuery}
                  onChange={(e) => setHybridQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             <div className="flex gap-2 mt-2">
               {['ISO27001', '年假', '报销'].map(q => (
                 <button key={q} onClick={() => setHybridQuery(q)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 transition-colors">
                   {q}
                 </button>
               ))}
             </div>
           </div>

           <div className="w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">Retrieval Mode</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['vector', 'keyword', 'hybrid'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSearchMode(m)}
                    className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                      searchMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
           </div>

           <div className="w-full md:w-auto flex flex-col justify-end space-y-3 pb-1">
             <label className="flex items-center space-x-2 cursor-pointer select-none">
               <input 
                type="checkbox" 
                checked={useAlias} 
                onChange={(e) => setUseAlias(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
              />
               <span className="text-sm text-gray-700">启用同义词扩展 (Alias)</span>
             </label>
             <div className="flex items-center space-x-2">
               <Filter className="w-4 h-4 text-gray-400" />
               <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 text-gray-600 p-0 cursor-pointer"
               >
                 <option value="all">Category: All</option>
                 <option value="hr">HR</option>
                 <option value="security">Security</option>
               </select>
             </div>
           </div>
         </div>
      </div>

      {/* 2. Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <th className="px-6 py-4 font-semibold w-16">Rank</th>
                <th className="px-6 py-4 font-semibold">Content Preview</th>
                <th className="px-6 py-4 font-semibold w-24 text-right">Vec Score</th>
                <th className="px-6 py-4 font-semibold w-24 text-right">Kw Score</th>
                <th className="px-6 py-4 font-semibold w-28 text-right bg-blue-50/50 text-blue-700">Hybrid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hybridResults.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    没有找到结果，请尝试更换关键词或过滤器。
                  </td>
                </tr>
              ) : (
                hybridResults.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 font-medium mb-1">
                        {item.text}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {item.matchedTerms.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded border border-yellow-200">
                            Match: {t}
                          </span>
                        ))}
                         <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">
                            Source: {item.vecCategory.toUpperCase()}
                          </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                       <span className={searchMode === 'keyword' ? 'opacity-30' : ''}>{item.vecScore}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-600">
                       <span className={searchMode === 'vector' ? 'opacity-30' : ''}>{item.kwScore}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-blue-600 bg-blue-50/30">
                       {item.hybridScore}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Debug Panel (Teacher's Note) */}
      <div className="bg-slate-800 text-slate-300 p-4 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2 mb-2 text-slate-100 font-bold">
           <Info className="w-4 h-4" />
           <span>DEBUG CONTEXT (讲师视角)</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>Applied Query: <span className="text-yellow-400">"{hybridQuery}"</span></p>
            <p>Expansion: <span className={useAlias ? "text-green-400" : "text-gray-500"}>{useAlias ? "ON (ISO27001 -> ISMS)" : "OFF"}</span></p>
          </div>
          <div>
            <p>Scoring Formula:</p>
            <p className="text-gray-400">
              {searchMode === 'hybrid' 
                ? "0.4 * VecScore + 0.6 * KwScore" 
                : searchMode === 'vector' ? "1.0 * VecScore" : "1.0 * KwScore"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-900 flex flex-col">
      {renderHeader()}
      {renderTabs()}
      
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chunking' && <ChunkingLab />}
        {activeTab === 'vector' && <VectorLab />}
        {activeTab === 'hybrid' && <HybridLab />}
      </div>
      
      {/* 页面右下角讲师提示卡 */}
      <div className="fixed bottom-6 right-6 bg-white border border-yellow-200 shadow-lg p-4 rounded-lg w-64 z-50 transform hover:scale-105 transition-transform hidden lg:block">
        <h4 className="text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center">
          <Info className="w-3 h-3 mr-1" />
          当前演示重点
        </h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          {activeTab === 'chunking' && "观察 Overlap 的作用：当切片正好切断一个句子时，相邻块的重叠能保证语义不丢失。"}
          {activeTab === 'vector' && "注意 Query 点的位置：它是根据语义（而非字面）落在某个颜色簇附近的。"}
          {activeTab === 'hybrid' && "试着搜 'ISO27001' 并开关 '同义词扩展'。这就是纯向量搜索容易 Miss，而混合检索能救回来的经典案例。"}
        </p>
      </div>
    </div>
  );
};

export default RAGPlayground;
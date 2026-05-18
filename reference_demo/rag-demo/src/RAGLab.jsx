import React, { useState, useMemo } from 'react';

// ============ 示例数据 ============
const SAMPLE_DOCUMENTS = [
  {
    id: 'doc-1',
    title: '员工手册 - 年假与报销',
    rawText: `第一章 年假管理制度

1.1 年假规则概述
员工入职满一年后，可享受带薪年假。年假天数根据工龄计算：工龄1-5年享有5天年假，工龄5-10年享有10天年假，工龄10年以上享有15天年假。

1.2 年假申请流程
员工需提前至少3个工作日在OA系统中提交年假申请。申请需注明休假起止日期、工作交接安排。直属主管需在2个工作日内审批。审批通过后，HR系统自动记录假期使用情况。

1.3 年假结转与清零
当年未休完的年假可结转至下一年度，但结转天数不得超过5天。结转的年假需在次年6月30日前休完，否则自动清零。特殊情况需书面申请延期。

第二章 费用报销制度

2.1 差旅费报销
员工因公出差产生的交通费、住宿费、餐饮费可申请报销。交通费按实际票据报销，飞机票需提前申请。住宿费按城市等级设定上限：一线城市每晚不超过500元，二线城市不超过350元。

2.2 报销流程说明
报销需在费用产生后30天内提交。员工需在报销系统填写申请单，上传发票照片和行程证明。部门主管审批后，财务部门将在5个工作日内完成打款。

2.3 发票要求
所有报销需提供正规发票，发票抬头为公司全称。电子发票和纸质发票均可接受。餐饮发票单张金额超过500元需附用餐人员名单说明。`
  },
  {
    id: 'doc-2', 
    title: 'ISO27001 信息安全管理',
    rawText: `第一章 信息安全管理体系概述

1.1 ISO27001认证介绍
ISO27001是国际公认的信息安全管理体系认证标准。该认证也被称为信息安全管理体系认证，是企业信息安全能力的重要证明。通过ISO27001认证表明企业已建立完善的信息安全管理框架。

1.2 认证范围与要求
信息安全管理体系认证涵盖访问控制、密码管理、网络安全、数据保护等多个领域。企业需建立完整的安全策略文档，定期进行风险评估，实施持续改进措施。

第二章 访问控制策略

2.1 账户权限管理
所有系统账户需遵循最小权限原则。新员工账户由IT部门统一创建，权限需经部门主管审批。离职员工账户需在离职当日禁用，7天内删除。

2.2 密码安全要求
系统密码需满足：长度不少于12位，包含大小写字母、数字和特殊符号。密码每90天强制更换一次。禁止使用与用户名相似或常见词组的密码。

第三章 数据安全保护

3.1 数据分级制度
公司数据分为公开、内部、机密、绝密四个等级。不同等级数据有不同的存储、传输和访问要求。机密及以上数据需加密存储。

3.2 数据备份策略
核心业务数据每日增量备份，每周全量备份。备份数据异地存储，保留周期不少于6个月。每季度进行一次数据恢复演练验证备份有效性。`
  }
];

// Chunk 颜色方案
const CHUNK_COLORS = [
  { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
  { bg: '#E3F2FD', border: '#2196F3', text: '#1565C0' },
  { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' },
  { bg: '#F3E5F5', border: '#9C27B0', text: '#7B1FA2' },
  { bg: '#E0F7FA', border: '#00BCD4', text: '#00838F' },
  { bg: '#FFEBEE', border: '#F44336', text: '#C62828' },
];

// 向量空间点数据 - 分散布局
const VECTOR_POINTS = [
  { id: 'v1', label: '年假规则', vector2D: [0.12, 0.88], category: '假期' },
  { id: 'v2', label: '带薪休假', vector2D: [0.22, 0.78], category: '假期' },
  { id: 'v3', label: '年假申请', vector2D: [0.32, 0.85], category: '假期' },
  { id: 'v4', label: '差旅报销', vector2D: [0.78, 0.82], category: '报销' },
  { id: 'v5', label: '发票要求', vector2D: [0.88, 0.72], category: '报销' },
  { id: 'v6', label: '报销流程', vector2D: [0.72, 0.90], category: '报销' },
  { id: 'v7', label: 'ISO27001', vector2D: [0.15, 0.22], category: '安全' },
  { id: 'v8', label: '信息安全', vector2D: [0.32, 0.12], category: '安全' },
  { id: 'v9', label: '密码安全', vector2D: [0.50, 0.18], category: '安全' },
  { id: 'v10', label: '数据备份', vector2D: [0.68, 0.12], category: '安全' },
  { id: 'v11', label: '访问控制', vector2D: [0.85, 0.25], category: '安全' },
  { id: 'v12', label: '账户权限', vector2D: [0.55, 0.30], category: '安全' },
];

const QUERY_PRESETS = [
  { label: '年假怎么休', vector2D: [0.18, 0.82] },
  { label: '怎么报销', vector2D: [0.75, 0.85] },
  { label: 'ISO27001要求', vector2D: [0.18, 0.20] },
  { label: '密码要求', vector2D: [0.48, 0.20] },
];

// Hybrid Search 数据
const HYBRID_DOCS = [
  { id: 'h1', title: 'ISO27001信息安全管理体系认证介绍', content: 'ISO27001是国际公认的信息安全管理体系认证标准，也称为信息安全管理体系认证...', aliases: ['ISO27001', '信息安全管理体系认证', 'ISMS认证'], category: '认证', year: 2024 },
  { id: 'h2', title: '企业信息安全策略概述', content: '企业信息安全包括访问控制、数据保护、网络安全等多个方面...', aliases: ['信息安全', '安全策略'], category: '安全', year: 2024 },
  { id: 'h3', title: '数据安全与隐私保护', content: '数据安全是信息安全的核心，涉及数据加密、备份、访问控制...', aliases: ['数据安全', '隐私保护'], category: '安全', year: 2023 },
  { id: 'h4', title: '网络安全防护措施', content: '网络安全包括防火墙配置、入侵检测、漏洞扫描等措施...', aliases: ['网络安全', '防火墙'], category: '安全', year: 2023 },
  { id: 'h5', title: '员工年假管理制度', content: '员工入职满一年后可享受带薪年假，具体天数根据工龄计算...', aliases: ['年假', '带薪休假', '假期'], category: '制度', year: 2024 },
  { id: 'h6', title: '差旅费用报销流程', content: '员工因公出差产生的交通费、住宿费可申请报销...', aliases: ['报销', '差旅费'], category: '流程', year: 2024 },
  { id: 'h7', title: 'SOC2合规认证指南', content: 'SOC2是另一种重要的安全合规认证，侧重于服务组织控制...', aliases: ['SOC2', '合规认证'], category: '认证', year: 2024 },
  { id: 'h8', title: '访问控制与权限管理', content: '访问控制是信息安全的基础，需遵循最小权限原则...', aliases: ['访问控制', '权限管理'], category: '安全', year: 2023 },
];

// ============ 工具函数 ============
function chunkText(text, strategy, chunkSize, overlap, enableParent) {
  const chunks = [];
  let chunkId = 0;
  
  const sections = [];
  const sectionRegex = /^(第[一二三四五六七八九十]+章|[0-9]+\.[0-9]+)\s*(.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ marker: match[1], title: match[2], index: match.index, isChapter: match[1].startsWith('第') });
  }
  
  if (strategy === 'fixed') {
    const step = Math.floor(chunkSize * (1 - overlap / 100));
    for (let i = 0; i < text.length; i += step) {
      const end = Math.min(i + chunkSize, text.length);
      const content = text.slice(i, end);
      if (content.trim()) {
        let sectionPath = [];
        for (const sec of sections) {
          if (sec.index <= i) {
            if (sec.isChapter) sectionPath = [sec.marker + ' ' + sec.title];
            else sectionPath.push(sec.marker + ' ' + sec.title);
          }
        }
        chunks.push({ id: `chunk-${chunkId++}`, content, startOffset: i, endOffset: end, type: 'paragraph', sectionPath });
      }
      if (end >= text.length) break;
    }
  } else if (strategy === 'sentence') {
    const sentences = text.split(/(?<=[。！？\n])/);
    const sentencesPerChunk = Math.max(2, Math.floor(chunkSize / 50));
    const overlapSentences = Math.floor(sentencesPerChunk * overlap / 100);
    const step = Math.max(1, sentencesPerChunk - overlapSentences);
    let currentOffset = 0;
    const sentenceOffsets = sentences.map(s => { const offset = currentOffset; currentOffset += s.length; return { text: s, offset }; });
    for (let i = 0; i < sentences.length; i += step) {
      const endIdx = Math.min(i + sentencesPerChunk, sentences.length);
      const chunkSentences = sentenceOffsets.slice(i, endIdx);
      const content = chunkSentences.map(s => s.text).join('');
      if (content.trim()) {
        let sectionPath = [];
        for (const sec of sections) {
          if (sec.index <= chunkSentences[0].offset) {
            if (sec.isChapter) sectionPath = [sec.marker + ' ' + sec.title];
            else if (sectionPath.length > 0) sectionPath = [sectionPath[0], sec.marker + ' ' + sec.title];
          }
        }
        chunks.push({ id: `chunk-${chunkId++}`, content, startOffset: chunkSentences[0].offset, endOffset: chunkSentences[chunkSentences.length - 1].offset + chunkSentences[chunkSentences.length - 1].text.length, type: 'paragraph', sectionPath });
      }
      if (endIdx >= sentences.length) break;
    }
  } else if (strategy === 'structural') {
    const paragraphs = text.split(/\n\n+/);
    let currentOffset = 0, currentChapter = '', currentSection = '';
    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (!trimmed) { currentOffset += para.length + 2; return; }
      const chapterMatch = trimmed.match(/^第[一二三四五六七八九十]+章\s*(.+)/);
      const sectionMatch = trimmed.match(/^([0-9]+\.[0-9]+)\s*(.+)/);
      let type = 'paragraph';
      if (chapterMatch) { currentChapter = trimmed; type = 'heading'; }
      else if (sectionMatch) { currentSection = trimmed; type = 'heading'; }
      const sectionPath = [];
      if (currentChapter) sectionPath.push(currentChapter);
      if (currentSection && !sectionMatch) sectionPath.push(currentSection);
      chunks.push({ id: `chunk-${chunkId++}`, content: trimmed, startOffset: text.indexOf(para, currentOffset), endOffset: text.indexOf(para, currentOffset) + para.length, type, sectionPath });
      currentOffset = text.indexOf(para, currentOffset) + para.length;
    });
  } else if (strategy === 'semantic') {
    const paragraphs = text.split(/\n\n+/);
    let currentOffset = 0, buffer = [], bufferStart = 0;
    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (!trimmed) { currentOffset += para.length + 2; return; }
      const paraStart = text.indexOf(para, currentOffset);
      const isNewTopic = trimmed.match(/^(第[一二三四五六七八九十]+章|[0-9]+\.[0-9]+)/) || (buffer.length > 0 && buffer.join('').length > chunkSize);
      if (isNewTopic && buffer.length > 0) {
        chunks.push({ id: `chunk-${chunkId++}`, content: buffer.join('\n\n'), startOffset: bufferStart, endOffset: currentOffset, type: 'semantic', sectionPath: [] });
        buffer = []; bufferStart = paraStart;
      }
      if (buffer.length === 0) bufferStart = paraStart;
      buffer.push(trimmed);
      currentOffset = paraStart + para.length;
    });
    if (buffer.length > 0) chunks.push({ id: `chunk-${chunkId++}`, content: buffer.join('\n\n'), startOffset: bufferStart, endOffset: text.length, type: 'semantic', sectionPath: [] });
  }
  
  chunks.forEach((chunk, i) => { if (i > 0) chunk.prevId = chunks[i - 1].id; if (i < chunks.length - 1) chunk.nextId = chunks[i + 1].id; });
  
  if (enableParent && strategy !== 'structural') {
    const parentChunks = [];
    let parentId = 0;
    const chapterGroups = {};
    chunks.forEach(chunk => { const chapter = chunk.sectionPath[0] || '未分类'; if (!chapterGroups[chapter]) chapterGroups[chapter] = []; chapterGroups[chapter].push(chunk); });
    Object.entries(chapterGroups).forEach(([chapter, children]) => {
      const parent = { id: `parent-${parentId++}`, content: chapter, startOffset: Math.min(...children.map(c => c.startOffset)), endOffset: Math.max(...children.map(c => c.endOffset)), type: 'parent', sectionPath: [chapter], childIds: children.map(c => c.id) };
      parentChunks.push(parent);
      children.forEach(c => c.parentId = parent.id);
    });
    return [...parentChunks, ...chunks];
  }
  return chunks;
}

function euclideanDistance(p1, p2) { return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)); }
function similarityScore(p1, p2) { return Math.max(0, 1 - euclideanDistance(p1, p2) / 1.2); }
function bm25Score(query, content, aliases = []) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();
  let score = 0;
  queryTerms.forEach(term => {
    const matches = contentLower.match(new RegExp(term, 'gi'));
    if (matches) score += matches.length * 2;
    aliases.forEach(alias => { if (alias.toLowerCase().includes(term) || term.includes(alias.toLowerCase())) score += 3; });
  });
  return Math.min(score / 10, 1);
}

// ============ 组件 ============
function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px',
      background: active ? '#1a1a1a' : 'transparent',
      border: 'none',
      borderRadius: '6px',
      color: active ? '#ffffff' : '#666',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
    }}>
      {children}
    </button>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, unit = '', disabled = false }) {
  return (
    <div style={{ marginBottom: '20px', opacity: disabled ? 0.4 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
        <span style={{ color: '#1a1a1a', fontSize: '13px', fontWeight: '500' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} disabled={disabled}
        style={{ width: '100%', height: '4px', borderRadius: '2px', background: `linear-gradient(to right, #1a1a1a ${(value - min) / (max - min) * 100}%, #e0e0e0 ${(value - min) / (max - min) * 100}%)`, appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none' }} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', color: '#666', fontSize: '13px', marginBottom: '8px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#1a1a1a', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
      <button onClick={() => onChange(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', background: checked ? '#1a1a1a' : '#e0e0e0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

// ============ Tab 1: Chunking Lab ============
function ChunkingLab({ document }) {
  const [strategy, setStrategy] = useState('fixed');
  const [chunkSize, setChunkSize] = useState(200);
  const [overlap, setOverlap] = useState(10);
  const [enableParent, setEnableParent] = useState(false);
  const [hoveredChunk, setHoveredChunk] = useState(null);
  const [selectedChunk, setSelectedChunk] = useState(null);
  
  const chunks = useMemo(() => chunkText(document.rawText, strategy, chunkSize, overlap, enableParent), [document, strategy, chunkSize, overlap, enableParent]);
  const regularChunks = chunks.filter(c => c.type !== 'parent');
  const parentChunks = chunks.filter(c => c.type === 'parent');
  
  const renderHighlightedText = () => {
    const text = document.rawText;
    const segments = [];
    let lastEnd = 0;
    const sortedChunks = [...regularChunks].sort((a, b) => a.startOffset - b.startOffset);
    sortedChunks.forEach((chunk, idx) => {
      const color = CHUNK_COLORS[idx % CHUNK_COLORS.length];
      const isActive = hoveredChunk === chunk.id || selectedChunk === chunk.id;
      if (chunk.startOffset > lastEnd) segments.push(<span key={`gap-${idx}`} style={{ color: '#999' }}>{text.slice(lastEnd, chunk.startOffset)}</span>);
      segments.push(
        <span key={chunk.id} onMouseEnter={() => setHoveredChunk(chunk.id)} onMouseLeave={() => setHoveredChunk(null)} onClick={() => setSelectedChunk(chunk.id)}
          style={{ background: color.bg, borderLeft: `3px solid ${color.border}`, paddingLeft: '4px', marginLeft: '-4px', borderRadius: '2px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: isActive ? `0 0 0 2px ${color.border}` : 'none', color: '#1a1a1a' }}>
          {text.slice(chunk.startOffset, chunk.endOffset)}
        </span>
      );
      lastEnd = chunk.endOffset;
    });
    if (lastEnd < text.length) segments.push(<span key="end" style={{ color: '#999' }}>{text.slice(lastEnd)}</span>);
    return segments;
  };
  
  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>原文视图</h3>
          <span style={{ color: '#888', fontSize: '12px' }}>{regularChunks.length} chunks · {document.rawText.length} 字符</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', fontSize: '14px', lineHeight: '2', whiteSpace: 'pre-wrap', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
          {renderHighlightedText()}
        </div>
      </div>
      <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', padding: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>分块参数</h3>
          <Select label="分块策略" value={strategy} onChange={setStrategy} options={[{ value: 'fixed', label: '固定长度' }, { value: 'sentence', label: '句子滑窗' }, { value: 'structural', label: '结构化分块' }, { value: 'semantic', label: '语义分块' }]} />
          <Slider label="Chunk Size" value={chunkSize} onChange={setChunkSize} min={100} max={500} step={50} unit=" 字符" disabled={strategy === 'structural'} />
          <Slider label="Overlap" value={overlap} onChange={setOverlap} min={0} max={50} step={5} unit="%" disabled={strategy === 'structural'} />
          <Toggle label="启用父子分块" checked={enableParent} onChange={setEnableParent} />
        </div>
        <div style={{ flex: 1, background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>Chunk 列表</h3>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {parentChunks.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>父块 ({parentChunks.length})</div>
                {parentChunks.map(chunk => (
                  <div key={chunk.id} style={{ padding: '10px', marginBottom: '6px', background: '#F3E5F5', border: '1px solid #CE93D8', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#7B1FA2', marginBottom: '4px' }}>{chunk.id}</div>
                    <div style={{ color: '#666' }}>{chunk.content}</div>
                    <div style={{ color: '#999', marginTop: '4px', fontSize: '11px' }}>包含 {chunk.childIds?.length || 0} 个子块</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>子块 ({regularChunks.length})</div>
            {regularChunks.map((chunk, idx) => {
              const color = CHUNK_COLORS[idx % CHUNK_COLORS.length];
              const isActive = hoveredChunk === chunk.id || selectedChunk === chunk.id;
              return (
                <div key={chunk.id} onMouseEnter={() => setHoveredChunk(chunk.id)} onMouseLeave={() => setHoveredChunk(null)} onClick={() => setSelectedChunk(chunk.id)}
                  style={{ padding: '12px', marginBottom: '6px', background: isActive ? color.bg : '#fff', border: `1px solid ${isActive ? color.border : '#eee'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: color.text, fontSize: '12px', fontWeight: '600' }}>{chunk.id}</span>
                    <span style={{ color: '#999', fontSize: '11px' }}>{chunk.content.length} 字符</span>
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{chunk.content.slice(0, 80)}...</div>
                  {chunk.sectionPath?.length > 0 && <div style={{ marginTop: '6px', color: '#999', fontSize: '11px' }}>📁 {chunk.sectionPath.join(' > ')}</div>}
                  {chunk.parentId && <div style={{ marginTop: '4px', color: '#7B1FA2', fontSize: '11px' }}>↑ {chunk.parentId}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Tab 2: Vector Intuition ============
function VectorIntuition() {
  const [query, setQuery] = useState('');
  const [queryVector, setQueryVector] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  const topK = useMemo(() => {
    if (!queryVector) return [];
    return VECTOR_POINTS.map(point => ({ ...point, similarity: similarityScore(queryVector, point.vector2D) })).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }, [queryVector]);
  
  const canvasWidth = 520;
  const canvasHeight = 420;
  const padding = 50;
  const toCanvasCoord = (v) => [padding + v[0] * (canvasWidth - 2 * padding), canvasHeight - padding - v[1] * (canvasHeight - 2 * padding)];
  const getCategoryColor = (cat) => ({ '假期': '#4CAF50', '报销': '#FF9800', '安全': '#2196F3' }[cat] || '#666');
  
  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>语义向量空间 (2D 示意)</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['假期', '报销', '安全'].map(cat => (
              <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getCategoryColor(cat) }} />{cat}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {QUERY_PRESETS.map(preset => (
            <button key={preset.label} onClick={() => { setQuery(preset.label); setQueryVector(preset.vector2D); }}
              style={{ padding: '8px 16px', background: query === preset.label ? '#1a1a1a' : '#fff', border: '1px solid #ddd', borderRadius: '20px', color: query === preset.label ? '#fff' : '#666', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              {preset.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
          <svg width={canvasWidth} height={canvasHeight}>
            <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e8e8e8" strokeWidth="1"/></pattern></defs>
            <rect x={padding} y={padding} width={canvasWidth - 2*padding} height={canvasHeight - 2*padding} fill="url(#grid)" />
            <line x1={padding} y1={canvasHeight - padding} x2={canvasWidth - padding} y2={canvasHeight - padding} stroke="#ccc" strokeWidth="1" />
            <line x1={padding} y1={padding} x2={padding} y2={canvasHeight - padding} stroke="#ccc" strokeWidth="1" />
            
            {/* 区域标签 */}
            <text x={padding + 20} y={padding + 25} fill="#4CAF50" fontSize="12" fontWeight="500" opacity="0.5">假期</text>
            <text x={canvasWidth - padding - 40} y={padding + 25} fill="#FF9800" fontSize="12" fontWeight="500" opacity="0.5">报销</text>
            <text x={(canvasWidth)/2 - 20} y={canvasHeight - padding - 15} fill="#2196F3" fontSize="12" fontWeight="500" opacity="0.5">安全</text>
            
            {/* 连接线 */}
            {queryVector && topK.slice(0, 3).map((point, idx) => {
              const [qx, qy] = toCanvasCoord(queryVector);
              const [px, py] = toCanvasCoord(point.vector2D);
              return <line key={`line-${point.id}`} x1={qx} y1={qy} x2={px} y2={py} stroke={getCategoryColor(point.category)} strokeWidth={idx === 0 ? 2 : 1} strokeOpacity={0.4} strokeDasharray={idx > 0 ? "6,4" : "none"} />;
            })}
            
            {/* 数据点 */}
            {VECTOR_POINTS.map(point => {
              const [cx, cy] = toCanvasCoord(point.vector2D);
              const isTop = topK.some(t => t.id === point.id);
              const rank = topK.findIndex(t => t.id === point.id);
              const isHovered = hoveredPoint === point.id;
              return (
                <g key={point.id} onMouseEnter={() => setHoveredPoint(point.id)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
                  {(isTop || isHovered) && <circle cx={cx} cy={cy} r={isHovered ? 22 : 18} fill={getCategoryColor(point.category)} fillOpacity={0.12} />}
                  <circle cx={cx} cy={cy} r={isTop ? 9 : 7} fill={getCategoryColor(point.category)} stroke={isTop ? '#fff' : 'none'} strokeWidth={2} />
                  {rank >= 0 && rank < 3 && <><circle cx={cx + 14} cy={cy - 14} r={10} fill="#FF5722" /><text x={cx + 14} y={cy - 10} fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">{rank + 1}</text></>}
                  {(isHovered || !queryVector) && <text x={cx} y={cy + 24} fill="#555" fontSize="11" textAnchor="middle" fontWeight={isHovered ? '600' : '400'}>{point.label}</text>}
                </g>
              );
            })}
            
            {/* Query 点 */}
            {queryVector && (
              <g>
                <circle cx={toCanvasCoord(queryVector)[0]} cy={toCanvasCoord(queryVector)[1]} r={14} fill="#FF5722" stroke="#fff" strokeWidth={3} />
                <text x={toCanvasCoord(queryVector)[0]} y={toCanvasCoord(queryVector)[1] - 22} fill="#FF5722" fontSize="13" fontWeight="bold" textAnchor="middle">Q: {query}</text>
              </g>
            )}
          </svg>
        </div>
        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#FFF8E1', borderRadius: '6px', fontSize: '12px', color: '#F57C00', textAlign: 'center' }}>
          💡 这是简化的 2D 示意图，真实 Embedding 是高维空间 (768/1536 维)
        </div>
      </div>
      
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>Top-5 相似结果</h3>
        {!queryVector ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', padding: '40px', textAlign: 'center' }}>
            <div><div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div><div>点击上方预设查询</div><div style={{ marginTop: '4px', color: '#bbb' }}>查看语义最相似的文档</div></div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {topK.map((result, idx) => (
              <div key={result.id} onMouseEnter={() => setHoveredPoint(result.id)} onMouseLeave={() => setHoveredPoint(null)}
                style={{ padding: '16px', marginBottom: '10px', background: hoveredPoint === result.id ? '#f8f8f8' : '#fff', border: `1px solid ${hoveredPoint === result.id ? getCategoryColor(result.category) : '#eee'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FF5722' : idx < 3 ? '#FF8A65' : '#eee', color: idx < 3 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>{idx + 1}</span>
                    <span style={{ color: '#1a1a1a', fontSize: '15px', fontWeight: '500' }}>{result.label}</span>
                  </div>
                  <span style={{ padding: '4px 10px', background: `${getCategoryColor(result.category)}15`, color: getCategoryColor(result.category), borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>{result.category}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#888', fontSize: '12px' }}>相似度</span>
                    <span style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{(result.similarity * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${result.similarity * 100}%`, height: '100%', background: getCategoryColor(result.category), borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Tab 3: Hybrid Search ============
function HybridSearch() {
  const [query, setQuery] = useState('ISO27001');
  const [searchMode, setSearchMode] = useState('hybrid');
  const [enableAlias, setEnableAlias] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const results = useMemo(() => {
    let docs = [...HYBRID_DOCS];
    if (categoryFilter !== 'all') docs = docs.filter(d => d.category === categoryFilter);
    return docs.map(doc => {
      const vecScore = (() => {
        const q = query.toLowerCase(), c = doc.content.toLowerCase(), t = doc.title.toLowerCase();
        if (q.includes('iso') || q.includes('27001')) { if (t.includes('iso') || doc.aliases.some(a => a.toLowerCase().includes('iso'))) return 0.85 + Math.random() * 0.1; if (c.includes('安全') || c.includes('认证')) return 0.6 + Math.random() * 0.15; }
        if (q.includes('年假') && (t.includes('年假') || c.includes('年假'))) return 0.9 + Math.random() * 0.08;
        if (q.includes('报销') && (t.includes('报销') || c.includes('报销'))) return 0.88 + Math.random() * 0.1;
        return 0.2 + Math.random() * 0.3;
      })();
      const kwScore = bm25Score(query, doc.title + ' ' + doc.content, enableAlias ? doc.aliases : []);
      const hybridScore = 0.4 * vecScore + 0.6 * kwScore;
      const matchedTerms = [];
      query.toLowerCase().split(/\s+/).forEach(term => {
        if (doc.title.toLowerCase().includes(term) || doc.content.toLowerCase().includes(term)) matchedTerms.push(term);
        if (enableAlias) doc.aliases.forEach(alias => { if (alias.toLowerCase().includes(term)) matchedTerms.push(`${alias} (别名)`); });
      });
      return { ...doc, vecScore, kwScore, hybridScore, matchedTerms: [...new Set(matchedTerms)], finalScore: searchMode === 'vector' ? vecScore : searchMode === 'keyword' ? kwScore : hybridScore };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [query, searchMode, enableAlias, categoryFilter]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', color: '#666', fontSize: '12px', marginBottom: '8px' }}>查询</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', color: '#1a1a1a', fontSize: '14px', outline: 'none' }} placeholder="输入查询..." />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {['ISO27001', '年假制度', '报销流程'].map(p => <button key={p} onClick={() => setQuery(p)} style={{ padding: '6px 12px', background: query === p ? '#1a1a1a' : '#fff', border: '1px solid #ddd', borderRadius: '16px', color: query === p ? '#fff' : '#666', fontSize: '12px', cursor: 'pointer' }}>{p}</button>)}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#666', fontSize: '12px', marginBottom: '8px' }}>检索模式</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ id: 'vector', label: 'Vector' }, { id: 'keyword', label: 'Keyword' }, { id: 'hybrid', label: 'Hybrid' }].map(m => (
                <button key={m.id} onClick={() => setSearchMode(m.id)} style={{ padding: '10px 16px', background: searchMode === m.id ? '#1a1a1a' : '#fff', border: '1px solid #ddd', borderRadius: '6px', color: searchMode === m.id ? '#fff' : '#666', fontSize: '13px', cursor: 'pointer', fontWeight: searchMode === m.id ? '600' : '400' }}>{m.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#666', fontSize: '12px', marginBottom: '8px' }}>分类</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '10px 14px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', color: '#1a1a1a', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
              <option value="all">全部</option><option value="认证">认证</option><option value="安全">安全</option><option value="制度">制度</option><option value="流程">流程</option>
            </select>
          </div>
          <button onClick={() => setEnableAlias(!enableAlias)} style={{ padding: '10px 16px', background: enableAlias ? '#E3F2FD' : '#fff', border: enableAlias ? '1px solid #2196F3' : '1px solid #ddd', borderRadius: '6px', color: enableAlias ? '#1565C0' : '#666', fontSize: '13px', cursor: 'pointer' }}>{enableAlias ? '✓' : '○'} 别名展开</button>
        </div>
      </div>
      
      <div style={{ flex: 1, background: '#fff', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 90px 140px 70px', gap: '12px', padding: '14px 20px', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '12px', color: '#888' }}>
          <span>#</span><span>标题</span><span style={{ textAlign: 'center' }}>Vec</span><span style={{ textAlign: 'center' }}>Kw</span><span style={{ textAlign: 'center' }}>Hybrid</span><span>匹配词</span><span>分类</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {results.map((r, idx) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 90px 140px 70px', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #f5f5f5', alignItems: 'center', background: idx === 0 ? '#FFFDE7' : '#fff' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FF5722' : '#f5f5f5', color: idx === 0 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>{idx + 1}</span>
              <div><div style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{r.title}</div><div style={{ color: '#999', fontSize: '12px' }}>{r.content.slice(0, 40)}...</div></div>
              <div style={{ textAlign: 'center', padding: '4px 8px', background: searchMode === 'vector' ? '#E3F2FD' : 'transparent', borderRadius: '4px', color: searchMode === 'vector' ? '#1565C0' : '#666', fontSize: '13px' }}>{r.vecScore.toFixed(2)}</div>
              <div style={{ textAlign: 'center', padding: '4px 8px', background: searchMode === 'keyword' ? '#FFEBEE' : 'transparent', borderRadius: '4px', color: searchMode === 'keyword' ? '#C62828' : '#666', fontSize: '13px' }}>{r.kwScore.toFixed(2)}</div>
              <div style={{ textAlign: 'center', padding: '4px 8px', background: searchMode === 'hybrid' ? '#E8F5E9' : 'transparent', borderRadius: '4px', color: searchMode === 'hybrid' ? '#2E7D32' : '#666', fontSize: '13px', fontWeight: searchMode === 'hybrid' ? '600' : '400' }}>{r.hybridScore.toFixed(2)}</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{r.matchedTerms.slice(0, 2).map((t, i) => <span key={i} style={{ padding: '2px 6px', background: '#FFF3E0', borderRadius: '4px', color: '#E65100', fontSize: '11px' }}>{t}</span>)}</div>
              <span style={{ padding: '4px 8px', background: '#f5f5f5', borderRadius: '12px', color: '#666', fontSize: '11px', textAlign: 'center' }}>{r.category}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: '#888' }}>Query: <span style={{ color: '#1a1a1a', fontWeight: '500' }}>{query}</span>{enableAlias && <span style={{ color: '#1565C0', marginLeft: '8px' }}>+ 别名展开</span>}<span style={{ marginLeft: '16px' }}>Hybrid 权重: Vec 40% + Kw 60%</span></span>
        <span style={{ padding: '6px 12px', background: searchMode === 'hybrid' ? '#E8F5E9' : '#f5f5f5', borderRadius: '6px', color: searchMode === 'hybrid' ? '#2E7D32' : '#888' }}>
          {searchMode === 'vector' && '🎯 纯向量 - 语义相似但可能漏关键词'}{searchMode === 'keyword' && '🔤 纯关键词 - 精确但缺语义理解'}{searchMode === 'hybrid' && '⚡ 混合模式 - 兼顾语义和精确匹配'}
        </span>
      </div>
    </div>
  );
}

// ============ 主应用 ============
export default function RAGLab() {
  const [activeTab, setActiveTab] = useState('chunking');
  const [selectedDoc, setSelectedDoc] = useState(SAMPLE_DOCUMENTS[0]);
  
  return (
    <div style={{ height: '100vh', background: '#fff', color: '#1a1a1a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f5f5f5; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #ccc; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #1a1a1a; cursor: pointer; }
      `}</style>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #eee', flexShrink: 0, height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>RAG 实验台</h1>
          <select value={selectedDoc.id} onChange={e => setSelectedDoc(SAMPLE_DOCUMENTS.find(d => d.id === e.target.value))} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', color: '#1a1a1a', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
            {SAMPLE_DOCUMENTS.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f5f5f5', borderRadius: '8px', padding: '4px' }}>
          <TabButton active={activeTab === 'chunking'} onClick={() => setActiveTab('chunking')}>Chunking</TabButton>
          <TabButton active={activeTab === 'vector'} onClick={() => setActiveTab('vector')}>Vector</TabButton>
          <TabButton active={activeTab === 'hybrid'} onClick={() => setActiveTab('hybrid')}>Hybrid</TabButton>
        </div>
      </header>
      
      <main style={{ flex: 1, padding: '20px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'chunking' && <ChunkingLab document={selectedDoc} />}
        {activeTab === 'vector' && <VectorIntuition />}
        {activeTab === 'hybrid' && <HybridSearch />}
      </main>
    </div>
  );
}
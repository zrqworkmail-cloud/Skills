import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

export const BLACK = '#03050A';
export const WHITE = '#FFFFFF';
export const LIGHT = '#A9C0D8';
export const MUTED = '#6B7785';
export const CYAN = '#7FD4E8';
export const GOLD = '#F5C26B';
export const GOLD_L = '#FFE2A8';
export const CN = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
export const DISPLAY = '"Agency FB", "Agency", sans-serif';
export const SERIF = '"Times New Roman", Times, serif';
export const M = 36;

/**
 * 全片统一页网格（对齐 SDUFE 模板）：
 * 36px 边距 / 左上 kicker+标题 / 通栏细线 y=96 / 右上院标填满页眉带 / 页脚三段垂直居中
 */
export const SlideFrame: React.FC<{
  kicker: string;
  title: string;
  page: string;
  date?: string;
  children?: React.ReactNode;
}> = ({ kicker, title, page, date = '2026/11/2', children }) => (
  <AbsoluteFill style={{ background: BLACK }}>
    {children}

    {/* 页眉 */}
    <div
      style={{
        position: 'absolute',
        left: M,
        top: 20,
        fontFamily: CN,
        fontSize: 18,
        fontWeight: 600,
        color: LIGHT,
        letterSpacing: 2,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {kicker}
    </div>
    <div
      style={{
        position: 'absolute',
        left: M,
        top: 46,
        fontFamily: CN,
        fontSize: 32,
        fontWeight: 800,
        color: WHITE,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </div>
    <div style={{ position: 'absolute', left: M, top: 96, width: 1920 - 2 * M, height: 2, background: WHITE, opacity: 0.28 }} />
    <Img
      src={staticFile('cai-logo.png')}
      style={{ position: 'absolute', right: M, top: 2, height: 98, width: 541, filter: 'brightness(0) invert(1)' }}
    />

    {/* 页脚 */}
    <div style={{ position: 'absolute', left: M, top: 1014, width: 1920 - 2 * M, height: 2, background: WHITE, opacity: 0.2 }} />
    <div
      style={{
        position: 'absolute',
        left: M,
        right: M,
        top: 1016,
        height: 64,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontFamily: SERIF,
        fontWeight: 400,
        color: MUTED,
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 22, justifySelf: 'start' }}>{date}</span>
      <span style={{ fontSize: 19, justifySelf: 'center', letterSpacing: 1 }}>
        SHANDONG UNIVERSITY OF FINANCE AND ECONOMICS
      </span>
      <span style={{ fontSize: 22, justifySelf: 'end' }}>{page}</span>
    </div>
  </AbsoluteFill>
);

import React, { useEffect, useRef } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

declare global {
  interface Window {
    GGBApplet: any;
  }
}

export const GeoGebraPanel: React.FC = () => {
  const appletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { geogebraObjects, setGeoGebraObjects } = useAppStore();

  // 定期更新对象列表
  useEffect(() => {
    const updateObjects = () => {
      const ggbApp = appletRef.current || (window as any).ggbApplet;
      if (ggbApp) {
        try {
          const objectNames = ggbApp.getAllObjectNames();
          const objects = objectNames.map((name: string) => ({
            name,
            type: ggbApp.getObjectType(name),
            definition: ggbApp.getCommandString(name),
            value: ggbApp.getValueString(name),
          }));
          setGeoGebraObjects(objects);
        } catch (error) {
          console.error('获取对象列表失败:', error);
        }
      }
    };

    const interval = setInterval(updateObjects, 2000); // 每2秒更新一次
    return () => clearInterval(interval);
  }, [setGeoGebraObjects]);

  useEffect(() => {
    // 初始化 GeoGebra
    const initGeoGebra = () => {
      if (typeof window.GGBApplet !== 'undefined' && containerRef.current) {
        try {
          const parameters = {
            id: 'ggbApplet',
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            showToolBar: true,
            showAlgebraInput: true,
            showMenuBar: false,
            enableRightClick: true,
            enableShiftDragZoom: true,
            showResetIcon: true,
            language: 'zh_CN',
            appletOnLoad: (api: any) => {
              console.log('GeoGebra API 就绪');
              // 将 API 保存到全局对象，供其他组件使用
              (window as any).ggbApplet = api;
              appletRef.current = api;
            }
          };

          const applet = new window.GGBApplet(parameters, true);
          applet.inject('geogebra-container');
          
          console.log('GeoGebra 初始化成功');
        } catch (error) {
          console.error('GeoGebra 初始化失败:', error);
        }
      } else {
        console.log('等待 GeoGebra 脚本加载...');
        // 如果 GeoGebra 脚本还没加载，等待一会儿再试
        setTimeout(initGeoGebra, 500);
      }
    };

    initGeoGebra();
  }, []);

  const handleExport = async () => {
    try {
      const ggbApp = appletRef.current || (window as any).ggbApplet;
      if (!ggbApp) {
        alert('GeoGebra 未就绪');
        return;
      }

      // 使用 GeoGebra API 导出 PNG
      const pngData = ggbApp.getPNGBase64(1.0, true, 72);
      
      // 下载图片
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${pngData}`;
      link.download = `geogebra-${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出图片失败');
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface)',
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--background)',
        }}
      >
        <h3 style={{ flex: 1, margin: 0, fontSize: '16px', fontWeight: '600' }}>
          GeoGebra 画板
        </h3>

        {geogebraObjects.length > 0 && (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {geogebraObjects.length} 个对象
          </span>
        )}

        <button
          onClick={handleExport}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '500',
            border: '1px solid var(--border)',
          }}
          title="导出 PNG"
        >
          <Download size={14} />
          导出
        </button>

        <button
          onClick={handleFullscreen}
          style={{
            padding: '6px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border)',
          }}
          title="全屏"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* GeoGebra 容器 */}
      <div
        ref={containerRef}
        id="geogebra-container"
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      />

      {/* 对象列表 */}
      {geogebraObjects.length > 0 && (
        <div
          style={{
            maxHeight: '150px',
            overflowY: 'auto',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            padding: '12px',
          }}
        >
          <h4
            style={{
              margin: '0 0 8px 0',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
            }}
          >
            当前对象
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {geogebraObjects.map((obj) => (
              <div
                key={obj.name}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                }}
                title={obj.definition || obj.type}
              >
                <code>{obj.name}</code>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>
                  ({obj.type})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


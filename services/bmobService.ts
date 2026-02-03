
import { BMOB_CONFIG } from '../constants';
import { DictionaryItem, RiskLevel } from '../types';

class BmobService {
  /**
   * 构造符合 Bmob REST API 规范的请求头
   */
  private getHeaders(method: string) {
    const headers: Record<string, string> = {
      'X-Bmob-Application-Id': BMOB_CONFIG.APP_ID,
      'X-Bmob-REST-API-Key': BMOB_CONFIG.REST_API_KEY,
    };

    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private readonly baseUrl = 'https://api.codenow.cn/1/classes';

  /**
   * 深度同步：自动分页抓取全量 Dictionary 协议
   * 利用 limit 和 skip 参数循环请求，直到获取所有数据
   */
  async fetchDictionary(): Promise<DictionaryItem[]> {
    const limit = 100; // 每页抓取 100 条
    let skip = 0;
    let allResults: any[] = [];
    let hasMore = true;

    try {
      console.log('启动深度协议同步程序 (分页模式)...');

      while (hasMore) {
        const url = `${this.baseUrl}/Dictionary?limit=${limit}&skip=${skip}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders('GET'),
          mode: 'cors',
          cache: 'no-cache'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`分页抓取失败 (Skip: ${skip}):`, errorText);
          throw new Error(`协议服务器响应异常: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];
        
        allResults = [...allResults, ...results];
        console.log(`已抓取 ${allResults.length} 条防御协议...`);

        // 如果获取到的条数等于 limit，说明可能还有下一页
        if (results.length === limit) {
          skip += limit;
        } else {
          hasMore = false;
        }
      }

      console.log(`全量同步完成，总计获取 ${allResults.length} 条防御共识`);

      // 映射云端原始数据到应用模型
      return allResults.map((item: any) => ({
        id: item.objectId,
        keyword: item.keyword || '未知词条',
        riskLevel: (item.riskLevel as RiskLevel) || RiskLevel.HIGH,
        variants: Array.isArray(item.variants) ? item.variants : [],
        isLocalOnly: false
      }));

    } catch (error) {
      console.error('深度同步核心故障:', error);
      throw error;
    }
  }

  /**
   * 将本地防御词条上报至云端协议库
   */
  async uploadItem(item: DictionaryItem): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/Dictionary`, {
        method: 'POST',
        headers: this.getHeaders('POST'),
        body: JSON.stringify({
          keyword: item.keyword,
          riskLevel: item.riskLevel,
          variants: item.variants
        })
      });
      return response.ok;
    } catch (error) {
      console.error('云端上报失败:', error);
      return false;
    }
  }

  /**
   * 试用期云端仲裁逻辑
   */
  async arbitrateTrials(localCount: number, machineId: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/DeviceStatus?where=${encodeURIComponent(JSON.stringify({ machineId }))}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders('GET'),
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return Math.min(localCount, data.results[0].trialCount);
      } else {
        await this.createDeviceRecord(machineId, localCount);
        return localCount;
      }
    } catch (e) {
      return localCount;
    }
  }

  /**
   * 更新云端试用计次
   */
  async updateCloudTrials(machineId: string, trialCount: number): Promise<boolean> {
    try {
      const queryUrl = `${this.baseUrl}/DeviceStatus?where=${encodeURIComponent(JSON.stringify({ machineId }))}`;
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: this.getHeaders('GET'),
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const objectId = data.results[0].objectId;
        await fetch(`${this.baseUrl}/DeviceStatus/${objectId}`, {
          method: 'PUT',
          headers: this.getHeaders('PUT'),
          body: JSON.stringify({ trialCount })
        });
        return true;
      } else {
        await this.createDeviceRecord(machineId, trialCount);
        return true;
      }
    } catch (e) {
      console.error('云端计次同步失败:', e);
      return false;
    }
  }

  private async createDeviceRecord(machineId: string, trialCount: number) {
    try {
      await fetch(`${this.baseUrl}/DeviceStatus`, {
        method: 'POST',
        headers: this.getHeaders('POST'),
        body: JSON.stringify({ machineId, trialCount })
      });
    } catch (e) {}
  }

  getMachineId(): string {
    let id = localStorage.getItem('sg_machine_id');
    if (!id) {
      id = 'SG-' + btoa(Math.random().toString(36).substr(2, 9)).toUpperCase().slice(0, 12);
      localStorage.setItem('sg_machine_id', id);
    }
    return id;
  }
}

export const bmobService = new BmobService();

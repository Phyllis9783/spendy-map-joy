import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      throw new Error('Text input is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing expense from text:', text);

    // Get current date/time in Taipei timezone
    const now = new Date();
    const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const today = taipeiTime.toISOString().split('T')[0];
    const yesterday = new Date(taipeiTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const currentYear = taipeiTime.getFullYear();

    console.log(`Current date (Taipei): ${today}, Current year: ${currentYear}`);

    // Call Lovable AI to parse the expense
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `你是一個專業的繁體中文記帳 AI 助手，擅長解析口語化的消費記錄。

⚠️ **重要：所有回應必須使用繁體中文（台灣正體）**
- 不要使用簡體字
- 地點名稱必須保持繁體（例如：美麗華、微風廣場、誠品書店）
- 描述文字必須是繁體中文
- 所有輸出必須符合台灣用語習慣

【當前資訊】
- 今天日期（台北時區）：${today}
- 當前年份：${currentYear}

【解析規則】
1. 金額提取：
   - 支援："150元"、"150塊"、"150"、"一百五"、"一百五十塊錢"、"¥150"
   - 如果有多個數字，選擇最合理的金額（例如："150個10元" → amount: 10）
   
2. 分類判斷（category）：
   - food: 餐飲、飲料、零食、咖啡、早餐、午餐、晚餐、宵夜、米粉、珍奶、奶茶
   - transport: 交通、計程車、Uber、公車、捷運、高鐵、加油
   - entertainment: 娛樂、電影、遊戲、KTV、旅遊
   - shopping: 購物、衣服、3C、家電、書籍
   - daily: 日常用品、生活用品、菜市場、超市、藥妝、買菜
   - 如果無法確定，優先選擇 daily

3. 時間解析（expense_date）：
   - **重要：使用台北時區 (UTC+8)，格式必須是 "${today}T12:00:00+08:00"**
   - **如果用戶沒有明確提到年份（如：2024年、去年等），一律使用當前年份 ${currentYear}**
   - "今天"、"今日" → ${today}（台北時區）
   - "昨天"、"昨日" → ${yesterdayStr}（台北時區）
   - "中午"、"午餐" → 12:00（台北時區）
   - "晚上"、"晚餐" → 19:00（台北時區）
   - "早上"、"早餐" → 08:00（台北時區）
   - 如果沒提到時間，使用當前時間（台北時區）
   - **絕對不要使用 UTC 時間（不要用 Z 後綴）**
   - **所有日期必須包含 +08:00 時區標記**

4. 地點提取（location_name）：
   - 品牌名稱：星巴克、麥當勞、全家、7-11
   - 商場百貨：美麗華、微風廣場、誠品書店、新光三越
   - 地點描述：公司樓下、家附近、士林夜市
   - **必須保持繁體中文原樣**
   - 如果沒提到，設為 null

【回應格式】
嚴格遵守以下 JSON 格式，不要添加任何解釋文字：
{
  "amount": <數字>,
  "category": "<分類>",
  "description": "<簡潔描述，10字內，繁體中文>",
  "location_name": "<地點或null，繁體中文>",
  "expense_date": "<ISO 8601格式，必須含+08:00>"
}

【範例】（使用當前日期和時區，注意繁體中文）
輸入："今天中午在星巴克花了150元買咖啡"
輸出：{"amount": 150, "category": "food", "description": "咖啡", "location_name": "星巴克", "expense_date": "${today}T12:00:00+08:00"}

輸入："美麗華晚餐150韓式料理"
輸出：{"amount": 150, "category": "food", "description": "韓式料理", "location_name": "美麗華", "expense_date": "${today}T19:00:00+08:00"}

輸入："微風廣場買衣服兩千"
輸出：{"amount": 2000, "category": "shopping", "description": "衣服", "location_name": "微風廣場", "expense_date": "${today}T14:00:00+08:00"}

輸入："昨天晚上計程車回家80塊"
輸出：{"amount": 80, "category": "transport", "description": "計程車", "location_name": null, "expense_date": "${yesterdayStr}T19:00:00+08:00"}

輸入："圍棋米粉100個¥10午餐"
輸出：{"amount": 10, "category": "food", "description": "圍棋米粉", "location_name": null, "expense_date": "${today}T12:00:00+08:00"}

輸入："公司樓下買了一杯珍奶五十五"
輸出：{"amount": 55, "category": "food", "description": "珍珠奶茶", "location_name": "公司樓下", "expense_date": "${today}T14:00:00+08:00"}

輸入："看電影兩百"
輸出：{"amount": 200, "category": "entertainment", "description": "電影", "location_name": null, "expense_date": "${today}T20:00:00+08:00"}

輸入："晚餐299"
輸出：{"amount": 299, "category": "food", "description": "晚餐", "location_name": null, "expense_date": "${today}T19:00:00+08:00"}

輸入："買菜花了三百塊在菜市場"
輸出：{"amount": 300, "category": "daily", "description": "買菜", "location_name": "菜市場", "expense_date": "${today}T10:00:00+08:00"}

請只回應 JSON，不要有其他內容。`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // Forward specific error codes for rate limiting and payment issues
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            code: 429
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Payment required. Please add credits to your account.',
            code: 402
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI response:', aiResponse);

    // Parse the JSON response from AI
    let parsedExpense;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedExpense = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Failed to parse expense data');
    }

    // Validate required fields
    if (!parsedExpense.amount || !parsedExpense.category) {
      throw new Error('Missing required fields: amount or category');
    }

    // Safeguard: Check if year needs correction
    // If input doesn't contain explicit year mention and parsed year isn't current year, correct it
    const hasYearMention = /20\d{2}年|去年|前年/.test(text);
    if (!hasYearMention && parsedExpense.expense_date) {
      const parsedDate = new Date(parsedExpense.expense_date);
      const parsedYear = parsedDate.getFullYear();
      const now = new Date();
      const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
      const currentYear = taipeiTime.getFullYear();
      
      if (parsedYear !== currentYear) {
        // Correct the year while preserving month, day, and time
        const correctedDate = new Date(parsedDate);
        correctedDate.setFullYear(currentYear);
        const originalDateStr = parsedExpense.expense_date;
        parsedExpense.expense_date = correctedDate.toISOString().replace('Z', '+08:00');
        console.log(`⚠️ Year correction applied: ${originalDateStr} → ${parsedExpense.expense_date}`);
      }
    }

    // Geocoding: if location_name exists, get coordinates
    let location_lat = null;
    let location_lng = null;
    
    if (parsedExpense.location_name) {
      try {
        const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
        if (GOOGLE_MAPS_API_KEY) {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parsedExpense.location_name)}&key=${GOOGLE_MAPS_API_KEY}`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
            location_lat = geocodeData.results[0].geometry.location.lat;
            location_lng = geocodeData.results[0].geometry.location.lng;
            console.log(`Geocoded "${parsedExpense.location_name}" to: ${location_lat}, ${location_lng}`);
          } else {
            console.log(`Geocoding failed for "${parsedExpense.location_name}": ${geocodeData.status}`);
          }
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        // Continue without coordinates
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expense: {
          amount: Number(parsedExpense.amount),
          category: parsedExpense.category,
          description: parsedExpense.description || '',
          location_name: parsedExpense.location_name || null,
          expense_date: parsedExpense.expense_date || new Date().toISOString(),
          location_lat,
          location_lng,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-expense function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

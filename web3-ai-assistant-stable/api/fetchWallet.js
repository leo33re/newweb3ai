 module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    const covalentResponse = await fetch(`https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${process.env.COVALENT_API_KEY}`);
    const covalentData = await covalentResponse.json();

    if (!covalentData.data || !covalentData.data.items) {
      return res.status(500).json({ message: 'Failed to fetch wallet data' });
    }

    const assets = covalentData.data.items.map(item => 
      `${item.contract_ticker_symbol}: ${item.balance / Math.pow(10, item.contract_decimals)}`
    ).join(', ');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一个专业的钱包资产分析师，分析用户钱包资产的特点和类型。' },
          { role: 'user', content: `钱包资产：${assets}，请进行分析。` }
        ]
      })
    });

    const openaiData = await openaiResponse.json();

    if (openaiData.error) {
      console.error('OpenAI API error:', openaiData.error);
      return res.status(500).json({ message: 'Failed to analyze wallet', detail: openaiData.error });
    }

    res.status(200).json({
      assets: covalentData.data.items,
      analysis: openaiData.choices[0].message.content
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

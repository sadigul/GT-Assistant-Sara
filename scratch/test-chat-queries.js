async function testQuery(query) {
  console.log(`\n========================================`);
  console.log(`TEST QUERY: "${query}"`);
  console.log(`========================================`);
  const start = Date.now();
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        history: [],
        department: "all"
      })
    });

    const data = await res.json();
    console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
    console.log(`Department Tag:`, data.departmentTag);
    console.log(`Structured Card Type:`, data.structuredCard?.type);
    if (data.structuredCard?.data) {
      const d = data.structuredCard.data;
      console.log(`Card Summary:`, d.order_number || d.name || d.company_name || d.title || d.shipment_number || d.invoice_number);
    }
    console.log(`\nSARA Content Preview:\n${data.content.slice(0, 350)}...\n`);
    console.log(`Follow-ups:`, data.suggestedFollowUps);
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

async function runAll() {
  await testQuery("what items are included in the Order SO-5507");
  await testQuery("is there any order today ?");
  await testQuery("what was the last product of the last order of Moses");
  await testQuery("Show dealer groups and parent accounts");
  await testQuery("Who are our top suppliers and what are their lead times?");
  await testQuery("What recent CRM activities or customer visits are logged?");
}

runAll();

async function testQuery(title, payload) {
  console.log(`\n========================================`);
  console.log(`TEST: ${title}`);
  console.log(`========================================`);
  const start = Date.now();
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`Status: ${res.status} (${Date.now() - start}ms)`);
    if (res.status >= 400) {
      console.log(`Error Response:`, data);
    } else {
      console.log(`Department Tag:`, data.departmentTag);
      console.log(`Structured Card:`, data.structuredCard?.type);
      console.log(`Content Preview:`, (data.content || "").slice(0, 200).replace(/\n/g, " "));
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

async function run() {
  // 1. Empty query
  await testQuery("Empty Query Check", { query: "   ", history: [] });

  // 2. History starting with model (the previous bug)
  await testQuery("History Starting With Model", {
    query: "What items are in order SO-5507?",
    history: [
      { role: "assistant", content: "Welcome to SARA AI Operations." },
      { role: "user", content: "Show me orders." },
      { role: "assistant", content: "Here are recent orders." }
    ]
  });

  // 3. Multi-turn order inquiry
  await testQuery("Order details inquiry", {
    query: "What was the last product of the last order of Moses",
    history: [
      { role: "user", content: "Who is Moses Nissan?" },
      { role: "assistant", content: "Moses Nissan is a premier dealership customer located in Huntington, WV." }
    ]
  });

  // 4. Supplier lead times
  await testQuery("Top suppliers inquiry", {
    query: "Who are our top suppliers and what are their lead times?",
    history: []
  });
}

run();

import { NextRequest, NextResponse } from "next/server";
import {
  executeCrudCreate,
  executeCrudUpdate,
  prepareCrudDeleteConfirmation,
  executeConfirmedCrudDelete,
  executeCrudUndo,
  executeCrudRedo,
  buildCrudMutationMarkdown,
} from "@/lib/sara-crud-engine";
import { CrudEntityTable, CrudMutationData } from "@/types/gt-operations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, table, identifier, fields, updates, mutation, actor } = body;

    if (action === "create") {
      const targetTable: CrudEntityTable = table || "rooftops";
      const res = await executeCrudCreate({
        table: targetTable,
        fields: fields || {},
        actor,
      });
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Failed to create record" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    if (action === "update") {
      const targetTable: CrudEntityTable = table || mutation?.table || "rooftops";
      const targetId = identifier || mutation?.recordId;
      const res = await executeCrudUpdate({
        table: targetTable,
        identifier: String(targetId || ""),
        updates: updates || {},
        actor,
      });
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Failed to update record" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    if (action === "prepare_delete") {
      const targetTable: CrudEntityTable = table || mutation?.table || "rooftops";
      const targetId = identifier || mutation?.recordId;
      const res = await prepareCrudDeleteConfirmation({
        table: targetTable,
        identifier: String(targetId || ""),
        actor,
      });
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Record not found" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    if (action === "confirm_delete") {
      if (!mutation) {
        return NextResponse.json(
          { success: false, error: "Missing pending deletion payload" },
          { status: 400 }
        );
      }
      const res = await executeConfirmedCrudDelete(
        mutation as CrudMutationData,
        actor
      );
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Failed to delete record" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    if (action === "undo") {
      if (!mutation) {
        return NextResponse.json(
          { success: false, error: "Missing mutation payload to undo" },
          { status: 400 }
        );
      }
      const res = await executeCrudUndo(mutation as CrudMutationData, actor);
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Failed to undo change" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    if (action === "redo") {
      if (!mutation) {
        return NextResponse.json(
          { success: false, error: "Missing mutation payload to redo" },
          { status: 400 }
        );
      }
      const res = await executeCrudRedo(mutation as CrudMutationData, actor);
      if (!res.success || !res.mutation) {
        return NextResponse.json(
          { success: false, error: res.error || "Failed to redo change" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        mutation: res.mutation,
        content: buildCrudMutationMarkdown(res.mutation),
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported CRUD action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API /api/crud] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

"use client";

// m12-email-templates — admin editor. Pick a template on the left; edit its
// subject + body (Unlayer drag-and-drop) on the right; Save exports the HTML
// and stores it (plus the Unlayer design JSON) via updateEmailTemplate.
// The editor is loaded client-only (ssr:false) since it mounts an iframe.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import type { UnlayerEditor } from "@unlayer/types";
import type { EmailTemplateRow } from "@/lib/types";
import { updateEmailTemplate } from "./actions";

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

type DesignJSON = Parameters<UnlayerEditor["loadDesign"]>[0];

// The merge tags available to every template, shown as a hint to the editor.
const MERGE_TAGS = [
  "requester_name",
  "requester_email",
  "platform",
  "product",
  "amount",
  "cycle",
  "reason",
  "team",
  "next_renewal_date",
];

export function EmailTemplatesManager({
  templates,
}: {
  templates: EmailTemplateRow[];
}) {
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "");
  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  const [subject, setSubject] = useState(selected?.subject ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlayerRef = useRef<UnlayerEditor | null>(null);
  const router = useRouter();

  // Load a template's design into the editor (blank when it has none yet).
  function applyDesign(t: EmailTemplateRow | null) {
    const editor = unlayerRef.current;
    if (editor && t?.design) {
      editor.loadDesign(t.design as DesignJSON);
    }
  }

  // Switching template resets the subject + reloads the design (discards any
  // unsaved edits to the current one).
  function selectTemplate(key: string) {
    const next = templates.find((t) => t.key === key) ?? null;
    setSelectedKey(key);
    setSubject(next?.subject ?? "");
    setStatus(null);
    setError(null);
    applyDesign(next);
  }

  function onReady(unlayer: UnlayerEditor) {
    unlayerRef.current = unlayer;
    applyDesign(selected);
  }

  function onSave() {
    const editor = unlayerRef.current;
    if (!editor || !selected) return;
    setError(null);
    setStatus(null);
    setSaving(true);
    editor.exportHtml(async (data) => {
      try {
        await updateEmailTemplate(selected.key, {
          subject,
          html: data.html,
          design: data.design,
        });
        setStatus("Saved.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save template.");
      } finally {
        setSaving(false);
      }
    });
  }

  if (!selected) {
    return (
      <Card padding={5}>
        <Text type="supporting">
          No email templates found. Apply the latest migration to seed them.
        </Text>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Template list */}
      <Card padding={2}>
        <VStack gap={1}>
          {templates.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant={t.key === selectedKey ? "secondary" : "ghost"}
              width="100%"
              label={t.name}
              onClick={() => selectTemplate(t.key)}
            />
          ))}
        </VStack>
      </Card>

      {/* Editor */}
      <Card padding={0}>
        <VStack gap={4} className="px-5 py-4">
          <Heading level={3}>{selected.name}</Heading>
          <TextInput
            label="Subject"
            value={subject}
            onChange={setSubject}
            isRequired
          />
          <VStack gap={1}>
            <Text type="label">Merge tags you can drop in (as text)</Text>
            <HStack gap={1} className="flex-wrap">
              {MERGE_TAGS.map((tag) => (
                <Badge key={tag} variant="neutral" label={`{{${tag}}}`} />
              ))}
            </HStack>
          </VStack>
        </VStack>
        <Divider />
        <EmailEditor
          onReady={onReady}
          minHeight={520}
          options={{ mergeTags: Object.fromEntries(
            MERGE_TAGS.map((t) => [t, { name: t, value: `{{${t}}}` }]),
          ) }}
        />
        <Divider />
        <HStack gap={3} hAlign="end" className="px-5 py-4">
          {status && <Text type="supporting">{status}</Text>}
          {error && (
            <Text type="supporting" className="text-error">
              {error}
            </Text>
          )}
          <Button
            type="button"
            variant="primary"
            label={saving ? "Saving…" : "Save template"}
            onClick={onSave}
            isDisabled={saving}
          />
        </HStack>
      </Card>
    </div>
  );
}

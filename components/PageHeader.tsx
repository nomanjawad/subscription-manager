// Shared page header — the consistent top of every authenticated page: a level-1
// title, an optional supporting subtitle, and optional right-aligned actions
// (buttons, filters). Built from Astryx layout primitives so spacing and
// wrapping match the rest of the system. Wrap the page body in <PageBody> to get
// the standard vertical rhythm without hand-rolled `space-y-*` divs.
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <HStack justify="between" align="end" gap={4} wrap="wrap">
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {subtitle ? <Text type="supporting">{subtitle}</Text> : null}
      </VStack>
      {actions ? (
        <HStack gap={2} align="center" wrap="wrap">
          {actions}
        </HStack>
      ) : null}
    </HStack>
  );
}

/** Standard page shell: header + body with consistent vertical spacing. */
export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <VStack gap={6} align="stretch">
      {children}
    </VStack>
  );
}

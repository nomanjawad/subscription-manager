// Generic page loading fallback — mirrors the standard page shape (header +
// stat row + a content card) with Astryx Skeletons. Used by the route-segment
// loading.tsx files so navigation shows instant, layout-matched shimmer instead
// of a blank screen while server data loads.
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";

export function PageSkeleton({ tiles = 5 }: { tiles?: number }) {
  return (
    <VStack gap={6} align="stretch">
      {/* Header: title + subtitle */}
      <VStack gap={2}>
        <Skeleton width={220} height={30} />
        <Skeleton width={320} height={15} />
      </VStack>

      {/* Stat tiles */}
      {tiles > 0 ? (
        <Grid columns={{ minWidth: 200, max: 5 }} gap={3}>
          {Array.from({ length: tiles }).map((_, i) => (
            <Card key={i} padding={4}>
              <HStack gap={3} align="center">
                <Skeleton width={40} height={40} radius={2} index={i} />
                <VStack gap={1}>
                  <Skeleton width={84} height={12} index={i} />
                  <Skeleton width={56} height={22} index={i} />
                </VStack>
              </HStack>
            </Card>
          ))}
        </Grid>
      ) : null}

      {/* Content card */}
      <Card padding={0}>
        <VStack gap={4} paddingInline={5} paddingBlock={4}>
          <Skeleton width={180} height={20} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={16} index={i} />
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}

'use client'
import { Flex, Typography, Breadcrumb } from 'antd'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: Array<{ title: string; href?: string }>
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((b) => ({ title: b.href ? <a href={b.href}>{b.title}</a> : b.title }))}
        />
      )}
      <Flex justify="space-between" align="center">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {actions && <Flex gap={8}>{actions}</Flex>}
      </Flex>
    </div>
  )
}

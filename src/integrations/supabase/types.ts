export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_denied_attempts: {
        Row: {
          context: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      apartment_access_requests: {
        Row: {
          connection: string
          created_at: string
          email: string
          full_name: string
          id: string
          note: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          connection: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          note?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          connection?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          note?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      apartment_access_sync: {
        Row: {
          authorized_count: number | null
          id: number
          last_error: string | null
          last_status: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          authorized_count?: number | null
          id?: number
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          authorized_count?: number | null
          id?: number
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      apartment_comments: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          listing_id: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          listing_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "apartment_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_listings: {
        Row: {
          area: string | null
          author_id: string
          author_name: string
          city: string | null
          contact: string | null
          created_at: string
          current_women: number | null
          description: string | null
          email: string | null
          entry_date: string | null
          expires_at: string
          id: string
          listing_type: string
          max_roommates: number | null
          phone: string | null
          price: number | null
          private_room: boolean | null
          seeking_count: number | null
          status: string
          sublet_from: string | null
          sublet_to: string | null
          title: string | null
          total_women: number | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          author_id: string
          author_name: string
          city?: string | null
          contact?: string | null
          created_at?: string
          current_women?: number | null
          description?: string | null
          email?: string | null
          entry_date?: string | null
          expires_at?: string
          id?: string
          listing_type: string
          max_roommates?: number | null
          phone?: string | null
          price?: number | null
          private_room?: boolean | null
          seeking_count?: number | null
          status?: string
          sublet_from?: string | null
          sublet_to?: string | null
          title?: string | null
          total_women?: number | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          author_id?: string
          author_name?: string
          city?: string | null
          contact?: string | null
          created_at?: string
          current_women?: number | null
          description?: string | null
          email?: string | null
          entry_date?: string | null
          expires_at?: string
          id?: string
          listing_type?: string
          max_roommates?: number | null
          phone?: string | null
          price?: number | null
          private_room?: boolean | null
          seeking_count?: number | null
          status?: string
          sublet_from?: string | null
          sublet_to?: string | null
          title?: string | null
          total_women?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      apartment_saved: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_saved_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "apartment_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_email_revocations: {
        Row: {
          email: string
          id: string
          reason: string | null
          revoked_at: string
          source: string | null
        }
        Insert: {
          email: string
          id?: string
          reason?: string | null
          revoked_at?: string
          source?: string | null
        }
        Update: {
          email?: string
          id?: string
          reason?: string | null
          revoked_at?: string
          source?: string | null
        }
        Relationships: []
      }
      authorized_emails: {
        Row: {
          authorized: boolean
          created_at: string
          email: string
          source: string | null
          updated_at: string
        }
        Insert: {
          authorized?: boolean
          created_at?: string
          email: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          authorized?: boolean
          created_at?: string
          email?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      baar_legacy_emails: {
        Row: {
          created_at: string
          email: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          source?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          id: string
          slug: string
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          slug: string
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category_slug: string | null
          content_html: string | null
          content_json: Json | null
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          publish_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category_slug?: string | null
          content_html?: string | null
          content_json?: Json | null
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category_slug?: string | null
          content_html?: string | null
          content_json?: Json | null
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          publish_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          slug?: string
        }
        Relationships: []
      }
      community_attachments: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          kind: string
          meta: string | null
          post_id: string | null
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: string | null
          post_id?: string | null
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: string | null
          post_id?: string | null
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_boys: {
        Row: {
          age: number | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          created_at: string
          created_by: string | null
          details: string | null
          dress_style: string | null
          ethnicity: string | null
          full_name: string
          id: string
          is_active: boolean
          last_edited_by: string | null
          looking_for: string | null
          orientation: string | null
          photo_storage_path: string | null
          photo_url: string | null
          positives: string | null
          source: string
          status: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          dress_style?: string | null
          ethnicity?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_edited_by?: string | null
          looking_for?: string | null
          orientation?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          positives?: string | null
          source?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          dress_style?: string | null
          ethnicity?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_edited_by?: string | null
          looking_for?: string | null
          orientation?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          positives?: string | null
          source?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_baar_inquiries: {
        Row: {
          boy_id: string
          created_at: string
          from_unread: number
          from_user: string
          id: string
          last_message_at: string
          status: string
          to_unread: number
          to_user: string
          updated_at: string
        }
        Insert: {
          boy_id: string
          created_at?: string
          from_unread?: number
          from_user: string
          id?: string
          last_message_at?: string
          status?: string
          to_unread?: number
          to_user: string
          updated_at?: string
        }
        Update: {
          boy_id?: string
          created_at?: string
          from_unread?: number
          from_user?: string
          id?: string
          last_message_at?: string
          status?: string
          to_unread?: number
          to_user?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_inquiries_boy_id_fkey"
            columns: ["boy_id"]
            isOneToOne: false
            referencedRelation: "community_baar_boys"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_inquiry_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          inquiry_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_inquiry_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "community_baar_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_recommendations: {
        Row: {
          boy_id: string
          contact_email: string | null
          contact_mode: string
          contact_phone: string | null
          created_at: string
          has_photo: boolean | null
          id: string
          legacy_email: string | null
          legacy_name: string | null
          legacy_phone: string | null
          note: string | null
          relationship_type: string
          source: string
          updated_at: string
          user_id: string | null
          visible: boolean
        }
        Insert: {
          boy_id: string
          contact_email?: string | null
          contact_mode?: string
          contact_phone?: string | null
          created_at?: string
          has_photo?: boolean | null
          id?: string
          legacy_email?: string | null
          legacy_name?: string | null
          legacy_phone?: string | null
          note?: string | null
          relationship_type: string
          source?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
        }
        Update: {
          boy_id?: string
          contact_email?: string | null
          contact_mode?: string
          contact_phone?: string | null
          created_at?: string
          has_photo?: boolean | null
          id?: string
          legacy_email?: string | null
          legacy_name?: string | null
          legacy_phone?: string | null
          note?: string | null
          relationship_type?: string
          source?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_recommendations_boy_id_fkey"
            columns: ["boy_id"]
            isOneToOne: false
            referencedRelation: "community_baar_boys"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_reports: {
        Row: {
          boy_id: string
          created_at: string
          details: string | null
          id: string
          kind: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          boy_id: string
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          boy_id?: string
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_reports_boy_id_fkey"
            columns: ["boy_id"]
            isOneToOne: false
            referencedRelation: "community_baar_boys"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_saved: {
        Row: {
          boy_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          boy_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          boy_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_saved_boy_id_fkey"
            columns: ["boy_id"]
            isOneToOne: false
            referencedRelation: "community_baar_boys"
            referencedColumns: ["id"]
          },
        ]
      }
      community_baar_suggestions: {
        Row: {
          boy_id: string
          created_at: string
          details: string
          id: string
          kind: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggester_id: string
        }
        Insert: {
          boy_id: string
          created_at?: string
          details: string
          id?: string
          kind: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggester_id: string
        }
        Update: {
          boy_id?: string
          created_at?: string
          details?: string
          id?: string
          kind?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_baar_suggestions_boy_id_fkey"
            columns: ["boy_id"]
            isOneToOne: false
            referencedRelation: "community_baar_boys"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          as_nickname: boolean
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          helpful_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          as_nickname?: boolean
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          helpful_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          as_nickname?: boolean
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          helpful_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_digest_state: {
        Row: {
          created_at: string
          daily_at: string | null
          updated_at: string
          user_id: string
          weekly_at: string | null
        }
        Insert: {
          created_at?: string
          daily_at?: string | null
          updated_at?: string
          user_id: string
          weekly_at?: string | null
        }
        Update: {
          created_at?: string
          daily_at?: string | null
          updated_at?: string
          user_id?: string
          weekly_at?: string | null
        }
        Relationships: []
      }
      community_events: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          date_label: string | null
          id: string
          place: string | null
          starts_at: string | null
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          date_label?: string | null
          id?: string
          place?: string | null
          starts_at?: string | null
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          date_label?: string | null
          id?: string
          place?: string | null
          starts_at?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      community_feedback: {
        Row: {
          admin_note: string | null
          app_version: string | null
          body: string
          context_id: string | null
          created_at: string
          feature: string | null
          id: string
          is_offline: boolean
          kind: string
          meta: Json
          notified_at: string | null
          reporter_user_id: string
          route: string | null
          screenshot: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          app_version?: string | null
          body: string
          context_id?: string | null
          created_at?: string
          feature?: string | null
          id?: string
          is_offline?: boolean
          kind: string
          meta?: Json
          notified_at?: string | null
          reporter_user_id: string
          route?: string | null
          screenshot?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          app_version?: string | null
          body?: string
          context_id?: string | null
          created_at?: string
          feature?: string | null
          id?: string
          is_offline?: boolean
          kind?: string
          meta?: Json
          notified_at?: string | null
          reporter_user_id?: string
          route?: string | null
          screenshot?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_heart_levels: {
        Row: {
          emoji: string
          key: string
          label: string
          min_hearts: number
          sort_order: number
        }
        Insert: {
          emoji: string
          key: string
          label: string
          min_hearts: number
          sort_order?: number
        }
        Update: {
          emoji?: string
          key?: string
          label?: string
          min_hearts?: number
          sort_order?: number
        }
        Relationships: []
      }
      community_heart_rules: {
        Row: {
          action: string
          hearts: number
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          action: string
          hearts?: number
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          action?: string
          hearts?: number
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_hearts_ledger: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          hearts: number
          id: string
          idem_key: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          hearts?: number
          id?: string
          idem_key: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          hearts?: number
          id?: string
          idem_key?: string
          user_id?: string
        }
        Relationships: []
      }
      community_inquiries: {
        Row: {
          age: number | null
          as_nickname: boolean
          author_full_name: string | null
          author_id: string
          background: string
          boy_name: string
          bumped_at: string | null
          city: string | null
          created_at: string
          details: string | null
          id: string
          info_types: string[]
          pinned: boolean
          status: string
          updated_at: string
          yeshiva: string | null
        }
        Insert: {
          age?: number | null
          as_nickname?: boolean
          author_full_name?: string | null
          author_id: string
          background: string
          boy_name: string
          bumped_at?: string | null
          city?: string | null
          created_at?: string
          details?: string | null
          id?: string
          info_types?: string[]
          pinned?: boolean
          status?: string
          updated_at?: string
          yeshiva?: string | null
        }
        Update: {
          age?: number | null
          as_nickname?: boolean
          author_full_name?: string | null
          author_id?: string
          background?: string
          boy_name?: string
          bumped_at?: string | null
          city?: string | null
          created_at?: string
          details?: string | null
          id?: string
          info_types?: string[]
          pinned?: boolean
          status?: string
          updated_at?: string
          yeshiva?: string | null
        }
        Relationships: []
      }
      community_inquiry_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          inquiry_id: string
          offer_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
          offer_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          offer_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_inquiry_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "community_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_inquiry_messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "community_inquiry_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_inquiry_offers: {
        Row: {
          connection_type: string
          contact_mode: string
          created_at: string
          helper_id: string
          id: string
          inquiry_id: string
          status: string
          thanked_at: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          connection_type: string
          contact_mode: string
          created_at?: string
          helper_id: string
          id?: string
          inquiry_id: string
          status?: string
          thanked_at?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          connection_type?: string
          contact_mode?: string
          created_at?: string
          helper_id?: string
          id?: string
          inquiry_id?: string
          status?: string
          thanked_at?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "community_inquiry_offers_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "community_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          ref_link: string | null
          ref_subtitle: string | null
          ref_title: string | null
          reply_to: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          ref_link?: string | null
          ref_subtitle?: string | null
          ref_title?: string | null
          reply_to?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          ref_link?: string | null
          ref_subtitle?: string | null
          ref_title?: string | null
          reply_to?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notices: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      community_place_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          place_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          place_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          place_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_place_reports_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "community_places"
            referencedColumns: ["id"]
          },
        ]
      }
      community_place_saved: {
        Row: {
          created_at: string
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_place_saved_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "community_places"
            referencedColumns: ["id"]
          },
        ]
      }
      community_place_suggestions: {
        Row: {
          created_at: string
          details: string
          id: string
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggester_id: string
        }
        Insert: {
          created_at?: string
          details: string
          id?: string
          place_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggester_id: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          place_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_place_suggestions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "community_places"
            referencedColumns: ["id"]
          },
        ]
      }
      community_places: {
        Row: {
          address: string | null
          archived_at: string | null
          archived_by: string | null
          area: string | null
          created_at: string
          created_by: string | null
          crowd_level: number | null
          details: string | null
          extra: Json
          id: string
          image_url: string | null
          is_active: boolean
          kashrut: string | null
          kind: string | null
          link: string | null
          loved_note: string | null
          min_payment: boolean | null
          name: string
          source: string
          transit: boolean | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area?: string | null
          created_at?: string
          created_by?: string | null
          crowd_level?: number | null
          details?: string | null
          extra?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean
          kashrut?: string | null
          kind?: string | null
          link?: string | null
          loved_note?: string | null
          min_payment?: boolean | null
          name: string
          source?: string
          transit?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area?: string | null
          created_at?: string
          created_by?: string | null
          crowd_level?: number | null
          details?: string | null
          extra?: Json
          id?: string
          image_url?: string | null
          is_active?: boolean
          kashrut?: string | null
          kind?: string | null
          link?: string | null
          loved_note?: string | null
          min_payment?: boolean | null
          name?: string
          source?: string
          transit?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          as_nickname: boolean
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          last_activity_at: string
          pinned: boolean
          show_in_sidebar: boolean
          space: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          as_nickname?: boolean
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          last_activity_at?: string
          pinned?: boolean
          show_in_sidebar?: boolean
          space: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          as_nickname?: boolean
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          last_activity_at?: string
          pinned?: boolean
          show_in_sidebar?: boolean
          space?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          about_area: string | null
          about_help: string | null
          about_loves: string | null
          about_work: string | null
          accepted_advertising_at: string | null
          accepted_agreement_at: string | null
          activity_seen_at: string | null
          avatar_in_nickname_mode: boolean
          avatar_url: string | null
          baar_access: boolean
          baar_access_granted_at: string | null
          baar_access_source: string | null
          baar_boys_count: number
          contact_email: string | null
          contact_show_email: boolean
          contact_show_whatsapp: boolean
          contact_via_liba: boolean
          contact_whatsapp: string | null
          created_at: string
          display_name: string
          first_name: string | null
          hearts: number
          interests: string[]
          last_name: string | null
          last_seen_at: string | null
          last_visit_at: string | null
          mastery_note: string | null
          mastery_tags: string[]
          name_confirmed_at: string | null
          nickname: string | null
          notify_prefs: Json
          onboarding_completed_at: string | null
          onboarding_skipped_at: string | null
          onboarding_version: number
          previous_visit_at: string | null
          profile_completed_at: string | null
          show_online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          about_area?: string | null
          about_help?: string | null
          about_loves?: string | null
          about_work?: string | null
          accepted_advertising_at?: string | null
          accepted_agreement_at?: string | null
          activity_seen_at?: string | null
          avatar_in_nickname_mode?: boolean
          avatar_url?: string | null
          baar_access?: boolean
          baar_access_granted_at?: string | null
          baar_access_source?: string | null
          baar_boys_count?: number
          contact_email?: string | null
          contact_show_email?: boolean
          contact_show_whatsapp?: boolean
          contact_via_liba?: boolean
          contact_whatsapp?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          hearts?: number
          interests?: string[]
          last_name?: string | null
          last_seen_at?: string | null
          last_visit_at?: string | null
          mastery_note?: string | null
          mastery_tags?: string[]
          name_confirmed_at?: string | null
          nickname?: string | null
          notify_prefs?: Json
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          onboarding_version?: number
          previous_visit_at?: string | null
          profile_completed_at?: string | null
          show_online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          about_area?: string | null
          about_help?: string | null
          about_loves?: string | null
          about_work?: string | null
          accepted_advertising_at?: string | null
          accepted_agreement_at?: string | null
          activity_seen_at?: string | null
          avatar_in_nickname_mode?: boolean
          avatar_url?: string | null
          baar_access?: boolean
          baar_access_granted_at?: string | null
          baar_access_source?: string | null
          baar_boys_count?: number
          contact_email?: string | null
          contact_show_email?: boolean
          contact_show_whatsapp?: boolean
          contact_via_liba?: boolean
          contact_whatsapp?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          hearts?: number
          interests?: string[]
          last_name?: string | null
          last_seen_at?: string | null
          last_visit_at?: string | null
          mastery_note?: string | null
          mastery_tags?: string[]
          name_confirmed_at?: string | null
          nickname?: string | null
          notify_prefs?: Json
          onboarding_completed_at?: string | null
          onboarding_skipped_at?: string | null
          onboarding_version?: number
          previous_visit_at?: string | null
          profile_completed_at?: string | null
          show_online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_pulse_checks: {
        Row: {
          anonymous: boolean
          closes_at: string | null
          created_at: string
          created_by: string | null
          featured: boolean
          followup_anonymous: boolean
          followup_placeholder: string | null
          followup_question: string | null
          followup_visible: boolean
          hide_results: boolean
          id: string
          intro: string | null
          multi: boolean
          options: Json
          pinned: boolean
          space: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          followup_anonymous?: boolean
          followup_placeholder?: string | null
          followup_question?: string | null
          followup_visible?: boolean
          hide_results?: boolean
          id?: string
          intro?: string | null
          multi?: boolean
          options?: Json
          pinned?: boolean
          space?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          followup_anonymous?: boolean
          followup_placeholder?: string | null
          followup_question?: string | null
          followup_visible?: boolean
          hide_results?: boolean
          id?: string
          intro?: string | null
          multi?: boolean
          options?: Json
          pinned?: boolean
          space?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_pulse_responses: {
        Row: {
          as_anonymous: boolean
          body: string
          created_at: string
          id: string
          pulse_id: string
          status: string
          user_id: string
        }
        Insert: {
          as_anonymous?: boolean
          body: string
          created_at?: string
          id?: string
          pulse_id: string
          status?: string
          user_id: string
        }
        Update: {
          as_anonymous?: boolean
          body?: string
          created_at?: string
          id?: string
          pulse_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_pulse_responses_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "community_pulse_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_pulse_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          pulse_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          pulse_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          pulse_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_pulse_votes_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "community_pulse_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_quiz_entries: {
        Row: {
          answer: string | null
          attempts: number
          campaign_id: string
          created_at: string
          flamingo_at: string | null
          hint_at: string | null
          note: string | null
          note_anonymous: boolean
          note_at: string | null
          solved_at: string | null
          updated_at: string
          user_id: string
          winner_rank: number | null
        }
        Insert: {
          answer?: string | null
          attempts?: number
          campaign_id?: string
          created_at?: string
          flamingo_at?: string | null
          hint_at?: string | null
          note?: string | null
          note_anonymous?: boolean
          note_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id: string
          winner_rank?: number | null
        }
        Update: {
          answer?: string | null
          attempts?: number
          campaign_id?: string
          created_at?: string
          flamingo_at?: string | null
          hint_at?: string | null
          note?: string | null
          note_anonymous?: boolean
          note_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id?: string
          winner_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_quiz_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "community_rotating_content"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      community_rotating_content: {
        Row: {
          body: string
          config: Json
          cover_image: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          post_id: string | null
          starts_at: string | null
          status: string
          tab_label: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          config?: Json
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind: string
          post_id?: string | null
          starts_at?: string | null
          status?: string
          tab_label: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          config?: Json
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          post_id?: string | null
          starts_at?: string | null
          status?: string
          tab_label?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rotating_content_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rotating_quiz_entries: {
        Row: {
          answer: string | null
          attempts: number
          campaign_id: string
          completed_at: string | null
          created_at: string
          hint_at: string | null
          note: string | null
          note_anonymous: boolean
          note_at: string | null
          solved_at: string | null
          updated_at: string
          user_id: string
          winner_rank: number | null
        }
        Insert: {
          answer?: string | null
          attempts?: number
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          hint_at?: string | null
          note?: string | null
          note_anonymous?: boolean
          note_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id: string
          winner_rank?: number | null
        }
        Update: {
          answer?: string | null
          attempts?: number
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          hint_at?: string | null
          note?: string | null
          note_anonymous?: boolean
          note_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id?: string
          winner_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_rotating_quiz_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "community_rotating_content"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_space_prefs: {
        Row: {
          created_at: string
          email_freq: string
          in_app: boolean
          masterit: boolean
          masterit_email_freq: string
          masterit_in_app: boolean
          masterit_since: string | null
          space: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_freq?: string
          in_app?: boolean
          masterit?: boolean
          masterit_email_freq?: string
          masterit_in_app?: boolean
          masterit_since?: string | null
          space: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_freq?: string
          in_app?: boolean
          masterit?: boolean
          masterit_email_freq?: string
          masterit_in_app?: boolean
          masterit_since?: string | null
          space?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_thread_participants: {
        Row: {
          archived: boolean
          as_nickname: boolean
          created_at: string
          last_read_at: string | null
          thread_id: string
          unread: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          as_nickname?: boolean
          created_at?: string
          last_read_at?: string | null
          thread_id: string
          unread?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          as_nickname?: boolean
          created_at?: string
          last_read_at?: string | null
          thread_id?: string
          unread?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_threads: {
        Row: {
          context_link: string | null
          context_subtitle: string | null
          context_title: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          source_id: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          context_link?: string | null
          context_subtitle?: string | null
          context_title?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          source_id?: string | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          context_link?: string | null
          context_subtitle?: string | null
          context_title?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          source_id?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_tools: {
        Row: {
          created_at: string
          credited_name: string | null
          id: string
          kind: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_attachment_id: string | null
          source_post_id: string | null
          space: string | null
          status: string
          storage_path: string | null
          submitted_by: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          credited_name?: string | null
          id?: string
          kind?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_attachment_id?: string | null
          source_post_id?: string | null
          space?: string | null
          status?: string
          storage_path?: string | null
          submitted_by?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          credited_name?: string | null
          id?: string
          kind?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_attachment_id?: string | null
          source_post_id?: string | null
          space?: string | null
          status?: string
          storage_path?: string | null
          submitted_by?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_tools_source_attachment_id_fkey"
            columns: ["source_attachment_id"]
            isOneToOne: false
            referencedRelation: "community_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tools_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts_sync_log: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          id: string
          name: string | null
          response_body: string | null
          source: string | null
          status_code: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          name?: string | null
          response_body?: string | null
          source?: string | null
          status_code?: number | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          name?: string | null
          response_body?: string | null
          source?: string | null
          status_code?: number | null
          success?: boolean
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_templates: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          defaults: Json
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          defaults?: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          defaults?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      events_db: {
        Row: {
          capacity: number | null
          city: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          early_price: number | null
          early_price_deadline: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          featured: boolean
          hebrew_date: string | null
          id: string
          location: string | null
          menu: string | null
          partner_logo: Json | null
          poster_style: Json | null
          registration: Json | null
          registration_status: string
          regular_price: number | null
          slug: string | null
          status: string
          tag: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          early_price?: number | null
          early_price_deadline?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          featured?: boolean
          hebrew_date?: string | null
          id?: string
          location?: string | null
          menu?: string | null
          partner_logo?: Json | null
          poster_style?: Json | null
          registration?: Json | null
          registration_status?: string
          regular_price?: number | null
          slug?: string | null
          status?: string
          tag?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          early_price?: number | null
          early_price_deadline?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          featured?: boolean
          hebrew_date?: string | null
          id?: string
          location?: string | null
          menu?: string | null
          partner_logo?: Json | null
          poster_style?: Json | null
          registration?: Json | null
          registration_status?: string
          regular_price?: number | null
          slug?: string | null
          status?: string
          tag?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      manual_authorized_emails: {
        Row: {
          approved_by: string | null
          authorized: boolean
          created_at: string
          email: string
          note: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          authorized?: boolean
          created_at?: string
          email: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          authorized?: boolean
          created_at?: string
          email?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          filename: string
          height: number | null
          id: string
          mime_type: string | null
          public_url: string
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      offline_sync_state: {
        Row: {
          content_version: number
          drive_file_id: string | null
          id: number
          last_error: string | null
          last_status: string | null
          last_synced_at: string | null
          media_count: number | null
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          content_version?: number
          drive_file_id?: string | null
          id?: number
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          media_count?: number | null
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          content_version?: number
          drive_file_id?: string | null
          id?: number
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          media_count?: number | null
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      podcast_episodes: {
        Row: {
          apple_url: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          episode_number: number | null
          id: string
          publish_date: string | null
          spotify_url: string | null
          status: string
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          apple_url?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          episode_number?: number | null
          id?: string
          publish_date?: string | null
          spotify_url?: string | null
          status?: string
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          apple_url?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          episode_number?: number | null
          id?: string
          publish_date?: string | null
          spotify_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      baar_admin_deletion_requests: { Args: never; Returns: Json }
      baar_admin_grant_access:
        | { Args: { _user_id: string }; Returns: undefined }
        | { Args: { _source: string; _user_id: string }; Returns: undefined }
      baar_admin_queue: { Args: never; Returns: Json }
      baar_admin_resolve_deletion: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      baar_admin_revoke_access: {
        Args: { _user_id: string }
        Returns: undefined
      }
      baar_archive: { Args: { _boy_id: string }; Returns: undefined }
      baar_bootstrap: { Args: never; Returns: Json }
      baar_create:
        | {
            Args: {
              _age: number
              _as_nickname: boolean
              _city: string
              _contact_mode: string
              _details: string
              _dress_style: string
              _ethnicity: string
              _full_name: string
              _looking_for: string
              _orientation: string
              _photo_url: string
              _positives: string
              _recommendation_note: string
              _relationship_type: string
              _status: string
            }
            Returns: string
          }
        | {
            Args: {
              _age: number
              _as_nickname: boolean
              _city: string
              _contact_email?: string
              _contact_mode: string
              _contact_phone?: string
              _details: string
              _dress_style: string
              _ethnicity: string
              _full_name: string
              _has_photo?: boolean
              _looking_for: string
              _orientation: string
              _photo_url: string
              _positives: string
              _recommendation_note: string
              _relationship_type: string
              _status: string
            }
            Returns: string
          }
      baar_find_similar: {
        Args: { _exclude_id: string; _name: string }
        Returns: Json
      }
      baar_grant_legacy_access: { Args: { _emails: string[] }; Returns: Json }
      baar_has_access: { Args: { _user_id: string }; Returns: boolean }
      baar_inquiry_create: {
        Args: { _body: string; _boy_id: string; _to_user: string }
        Returns: string
      }
      baar_inquiry_reply: {
        Args: { _body: string; _inquiry_id: string }
        Returns: undefined
      }
      baar_inquiry_set_status: {
        Args: { _inquiry_id: string; _status: string }
        Returns: undefined
      }
      baar_inquiry_thread: { Args: { _inquiry_id: string }; Returns: Json }
      baar_inquiry_threads: { Args: never; Returns: Json }
      baar_is_admin: { Args: { _user_id: string }; Returns: boolean }
      baar_list: {
        Args: {
          _dress_style: string
          _ethnicity: string
          _has_recommendations: boolean
          _limit: number
          _max_age: number
          _min_age: number
          _offset: number
          _orientation: string
          _query: string
          _sort: string
          _status: string
        }
        Returns: Json
      }
      baar_profile: { Args: { _boy_id: string }; Returns: Json }
      baar_recommend:
        | {
            Args: {
              _boy_id: string
              _contact_mode: string
              _note: string
              _relationship_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _boy_id: string
              _contact_email?: string
              _contact_mode: string
              _contact_phone?: string
              _has_photo?: boolean
              _note: string
              _relationship_type: string
            }
            Returns: undefined
          }
      baar_remove_recommendation: {
        Args: { _boy_id: string }
        Returns: undefined
      }
      baar_report: {
        Args: { _boy_id: string; _details: string; _reason: string }
        Returns: undefined
      }
      baar_request_deletion: {
        Args: { _boy_id: string; _details: string; _reason: string }
        Returns: undefined
      }
      baar_saved_list: { Args: never; Returns: Json }
      baar_suggest: {
        Args: { _boy_id: string; _details: string; _kind: string }
        Returns: undefined
      }
      baar_sync_legacy_access: {
        Args: { _user_id: string }
        Returns: undefined
      }
      baar_toggle_save: { Args: { _boy_id: string }; Returns: boolean }
      baar_update: {
        Args: {
          _age: number
          _boy_id: string
          _city: string
          _details: string
          _dress_style: string
          _ethnicity: string
          _full_name: string
          _looking_for: string
          _orientation: string
          _photo_url: string
          _positives: string
          _status: string
        }
        Returns: undefined
      }
      community_accept_agreement: {
        Args: { _advertising: boolean; _community: boolean }
        Returns: undefined
      }
      community_active_rotating_content: { Args: never; Returns: Json }
      community_activity_since: { Args: { _uid: string }; Returns: string }
      community_add_comment: {
        Args: {
          _as_nickname?: boolean
          _body: string
          _parent_id?: string
          _post_id: string
        }
        Returns: string
      }
      community_admin_pin: {
        Args: { _pinned: boolean; _post_id: string }
        Returns: undefined
      }
      community_admin_queue: { Args: never; Returns: Json }
      community_admin_review_report: {
        Args: { _action: string; _id: string }
        Returns: undefined
      }
      community_admin_review_tool: {
        Args: { _approve: boolean; _id: string; _title?: string }
        Returns: undefined
      }
      community_admin_set_sidebar: {
        Args: { _post_id: string; _show: boolean }
        Returns: undefined
      }
      community_attachments_json: {
        Args: { _comment: string; _post: string }
        Returns: Json
      }
      community_author_json: {
        Args: { _as_nick: boolean; _author: string; _viewer: string }
        Returns: Json
      }
      community_award_hearts: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _idem: string
          _uid: string
        }
        Returns: number
      }
      community_bootstrap: { Args: never; Returns: Json }
      community_create_post: {
        Args: {
          _as_nickname?: boolean
          _attachments?: Json
          _body: string
          _space: string
          _title?: string
        }
        Returns: string
      }
      community_delete_content: {
        Args: { _id: string; _type: string }
        Returns: undefined
      }
      community_ensure_profile: { Args: never; Returns: undefined }
      community_feed: {
        Args: {
          _limit?: number
          _offset?: number
          _query?: string
          _saved?: boolean
          _sort?: string
          _space?: string
        }
        Returns: Json
      }
      community_global_search: {
        Args: { _kind?: string; _limit?: number; _offset?: number; _q: string }
        Returns: Json
      }
      community_hearts_json: { Args: { _uid: string }; Returns: Json }
      community_initials: { Args: { _name: string }; Returns: string }
      community_inquiry_admin_action: {
        Args: { _action: string; _id: string; _payload?: Json }
        Returns: Json
      }
      community_inquiry_author_json: {
        Args: { _as_nickname: boolean; _uid: string; _viewer: string }
        Returns: Json
      }
      community_inquiry_cancel_offer: {
        Args: { _inquiry_id: string }
        Returns: Json
      }
      community_inquiry_create: { Args: { _payload: Json }; Returns: string }
      community_inquiry_feed: {
        Args: {
          _background?: string
          _help_status?: string
          _limit?: number
          _offset?: number
          _query?: string
        }
        Returns: Json
      }
      community_inquiry_json: {
        Args: { _id: string; _viewer: string }
        Returns: Json
      }
      community_inquiry_message: {
        Args: { _body: string; _offer_id: string }
        Returns: undefined
      }
      community_inquiry_offer: {
        Args: {
          _connection_type: string
          _contact_mode: string
          _inquiry_id: string
          _visible: boolean
        }
        Returns: Json
      }
      community_inquiry_set_status: {
        Args: { _id: string; _status: string }
        Returns: Json
      }
      community_inquiry_thank_offer: {
        Args: { _offer_id: string }
        Returns: Json
      }
      community_inquiry_threads: {
        Args: { _inquiry_id: string }
        Returns: Json
      }
      community_is_member: { Args: { _user_id: string }; Returns: boolean }
      community_mark_activity_seen: { Args: never; Returns: Json }
      community_mark_helpful: { Args: { _comment_id: string }; Returns: Json }
      community_member_profile: { Args: { _uid: string }; Returns: Json }
      community_my_activity: { Args: { _limit?: number }; Returns: Json }
      community_my_activity_count: { Args: never; Returns: Json }
      community_my_activity_items: {
        Args: { _limit: number; _seen: string; _uid: string }
        Returns: Json
      }
      community_my_hearts: { Args: never; Returns: Json }
      community_onboarding_state: { Args: never; Returns: Json }
      community_profile_json: { Args: { _uid: string }; Returns: Json }
      community_pulse_admin_set: {
        Args: {
          _featured?: boolean
          _id: string
          _pinned?: boolean
          _status?: string
        }
        Returns: Json
      }
      community_pulse_delete: { Args: { _id: string }; Returns: undefined }
      community_pulse_json: {
        Args: { _id: string; _viewer: string }
        Returns: Json
      }
      community_pulse_list: {
        Args: { _all?: boolean; _space?: string }
        Returns: Json
      }
      community_pulse_remove_response: {
        Args: { _id: string }
        Returns: undefined
      }
      community_pulse_respond: {
        Args: { _anonymous?: boolean; _body: string; _id: string }
        Returns: Json
      }
      community_pulse_upsert: {
        Args: { _id: string; _payload: Json }
        Returns: Json
      }
      community_pulse_vote: {
        Args: { _id: string; _options: string[] }
        Returns: Json
      }
      community_quiz_admin_list: { Args: never; Returns: Json }
      community_quiz_answer: { Args: { _choice: string }; Returns: Json }
      community_quiz_draw: { Args: never; Returns: Json }
      community_quiz_host: { Args: never; Returns: string }
      community_quiz_note: {
        Args: { _anonymous?: boolean; _body: string }
        Returns: Json
      }
      community_quiz_state: { Args: never; Returns: Json }
      community_reaction_actors: {
        Args: { _kind?: string; _target_id: string; _target_type: string }
        Returns: Json
      }
      community_reactions_json: {
        Args: { _id: string; _type: string; _viewer: string }
        Returns: Json
      }
      community_recommend_tool: {
        Args: { _attachment_id?: string; _note?: string; _post_id: string }
        Returns: undefined
      }
      community_report: {
        Args: { _id: string; _reason?: string; _type: string }
        Returns: undefined
      }
      community_rotating_admin_archive: {
        Args: { _id: string }
        Returns: undefined
      }
      community_rotating_admin_duplicate: {
        Args: { _id: string }
        Returns: string
      }
      community_rotating_admin_list: { Args: never; Returns: Json }
      community_rotating_admin_upsert: {
        Args: {
          _body: string
          _config?: Json
          _cover_image: string
          _ends_at: string
          _id: string
          _kind: string
          _starts_at: string
          _status: string
          _tab_label: string
          _title: string
        }
        Returns: string
      }
      community_rotating_quiz_admin_list: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      community_rotating_quiz_answer: {
        Args: { _campaign_id: string; _choice: string }
        Returns: Json
      }
      community_rotating_quiz_draw: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      community_rotating_quiz_is_active: {
        Args: { _campaign_id: string }
        Returns: boolean
      }
      community_rotating_quiz_note: {
        Args: { _anonymous?: boolean; _body: string; _campaign_id: string }
        Returns: Json
      }
      community_rotating_quiz_state: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      community_save_onboarding: {
        Args: {
          _done?: boolean
          _interests?: string[]
          _skipped?: boolean
          _version?: number
        }
        Returns: Json
      }
      community_set_masterit: {
        Args: { _mode?: string; _on: boolean; _space: string }
        Returns: Json
      }
      community_set_nickname: { Args: { _nick: string }; Returns: Json }
      community_set_space_pref: {
        Args: { _email_freq?: string; _in_app?: boolean; _space: string }
        Returns: Json
      }
      community_sidebar_notices: { Args: never; Returns: Json }
      community_space_prefs: { Args: never; Returns: Json }
      community_thread: { Args: { _post_id: string }; Returns: Json }
      community_toggle_reaction: {
        Args: { _kind: string; _target_id: string; _target_type: string }
        Returns: Json
      }
      community_toggle_save: { Args: { _post_id: string }; Returns: boolean }
      community_touch_presence: { Args: never; Returns: undefined }
      community_update_content: {
        Args: { _body: string; _id: string; _title?: string; _type: string }
        Returns: undefined
      }
      community_update_profile: {
        Args: {
          _about?: Json
          _avatar?: string
          _avatar_in_nickname_mode?: boolean
          _clear_avatar?: boolean
          _first?: string
          _last?: string
          _nick?: string
          _notify_prefs?: Json
          _show_online?: boolean
        }
        Returns: Json
      }
      has_apartment_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_forum_member: { Args: { _user_id: string }; Returns: boolean }
      liba_feedback_admin_list: {
        Args: { _kind?: string; _limit?: number; _status?: string }
        Returns: Json
      }
      liba_feedback_admin_update: {
        Args: {
          _admin_note?: string
          _id: string
          _notify?: boolean
          _status?: string
        }
        Returns: Json
      }
      liba_feedback_mine: { Args: { _limit?: number }; Returns: Json }
      liba_feedback_send: {
        Args: {
          _app_version?: string
          _body: string
          _context_id?: string
          _feature?: string
          _is_offline?: boolean
          _kind: string
          _meta?: Json
          _route?: string
          _screenshot?: string
        }
        Returns: Json
      }
      liba_in_thread: {
        Args: { _thread_id: string; _uid: string }
        Returns: boolean
      }
      liba_message_delete: { Args: { _message_id: string }; Returns: Json }
      liba_messages_unread: { Args: never; Returns: Json }
      liba_new_counts: {
        Args: {
          _baar_since?: string
          _birurim_since?: string
          _dirot_since?: string
        }
        Returns: Json
      }
      liba_send: {
        Args: {
          _body: string
          _ref_link?: string
          _ref_subtitle?: string
          _ref_title?: string
          _reply_to?: string
          _thread_id: string
        }
        Returns: Json
      }
      liba_thread: { Args: { _thread_id: string }; Returns: Json }
      liba_thread_mark_read: { Args: { _thread_id: string }; Returns: Json }
      liba_thread_open: {
        Args: {
          _context_link?: string
          _context_subtitle?: string
          _context_title?: string
          _other: string
          _source_id?: string
          _source_type?: string
        }
        Returns: string
      }
      liba_threads: { Args: { _limit?: number }; Returns: Json }
      my_apartment_access: { Args: never; Returns: boolean }
      normalize_email: { Args: { _e: string }; Returns: string }
      places_admin_queue: { Args: never; Returns: Json }
      places_admin_resolve: {
        Args: { _id: string; _kind: string; _status: string }
        Returns: undefined
      }
      places_bootstrap: { Args: never; Returns: Json }
      places_create: {
        Args: {
          _address: string
          _area: string
          _crowd_level: number
          _details: string
          _image_url: string
          _kashrut: string
          _kind: string
          _link: string
          _loved_note: string
          _min_payment: boolean
          _name: string
          _transit: boolean
        }
        Returns: string
      }
      places_detail: { Args: { _place_id: string }; Returns: Json }
      places_find_similar: {
        Args: { _exclude_id: string; _name: string }
        Returns: Json
      }
      places_list: {
        Args: {
          _area: string
          _kashrut: string
          _kind: string
          _limit: number
          _max_crowd: number
          _mine_only: boolean
          _no_min_payment: boolean
          _offset: number
          _query: string
          _saved_only: boolean
          _sort: string
          _transit: boolean
        }
        Returns: Json
      }
      places_report: {
        Args: { _details: string; _place_id: string; _reason: string }
        Returns: undefined
      }
      places_saved_list: { Args: never; Returns: Json }
      places_set_active: {
        Args: { _active: boolean; _place_id: string }
        Returns: undefined
      }
      places_suggest: {
        Args: { _details: string; _place_id: string }
        Returns: undefined
      }
      places_toggle_save: { Args: { _place_id: string }; Returns: boolean }
      places_update: {
        Args: {
          _address: string
          _area: string
          _crowd_level: number
          _details: string
          _image_url: string
          _kashrut: string
          _kind: string
          _link: string
          _loved_note: string
          _min_payment: boolean
          _name: string
          _place_id: string
          _transit: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
    },
  },
} as const

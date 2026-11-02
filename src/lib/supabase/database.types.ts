
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "availability_entries": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"kind": Database["public"]['Enums']["availability_kind"],"member_id": string,"source": Database["public"]['Enums']["entry_source"],"starts_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"kind"?: Database["public"]['Enums']["availability_kind"],"member_id": string,"source"?: Database["public"]['Enums']["entry_source"],"starts_at": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["availability_kind"],"member_id"?: string,"source"?: Database["public"]['Enums']["entry_source"],"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_entries_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "project_members"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_rules": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"kind": Database["public"]['Enums']["availability_kind"],"member_id": string | null,"start_time": string,"updated_at": string,"user_id": string | null,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"kind"?: Database["public"]['Enums']["availability_kind"],"member_id"?: string | null,"start_time": string,"updated_at"?: string,"user_id"?: string | null,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["availability_kind"],"member_id"?: string | null,"start_time"?: string,"updated_at"?: string,"user_id"?: string | null,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "project_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_rules_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"project_id": string,"revoked_at": string | null,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"project_id": string,"revoked_at"?: string | null,"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"project_id"?: string,"revoked_at"?: string | null,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"member_weeks": {
                  Row: {
                    "confirmed_at": string | null,"member_id": string,"updated_at": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"member_id": string,"updated_at"?: string,"week_start": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"member_id"?: string,"updated_at"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_weeks_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "project_members"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"presets": Json | null,"updated_at": string,"usual_end_time": string,"usual_start_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"presets"?: Json | null,"updated_at"?: string,"usual_end_time"?: string,"usual_start_time"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"presets"?: Json | null,"updated_at"?: string,"usual_end_time"?: string,"usual_start_time"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_members": {
                  Row: {
                    "created_at": string,"display_name": string,"guest_token_hash": string | null,"id": string,"project_id": string,"removed_at": string | null,"role": Database["public"]['Enums']["member_role"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"guest_token_hash"?: string | null,"id"?: string,"project_id": string,"removed_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"guest_token_hash"?: string | null,"id"?: string,"project_id"?: string,"removed_at"?: string | null,"role"?: Database["public"]['Enums']["member_role"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "allow_guests": boolean,"created_at": string,"description": string | null,"end_date": string,"host_id": string,"id": string,"max_session_minutes": number | null,"members_can_invite": boolean,"min_participants": number,"min_session_minutes": number | null,"name": string,"planning_mode": Database["public"]['Enums']["planning_mode"],"preferred_session_minutes": number | null,"show_individual_availability": boolean,"slot_minutes": number,"start_date": string,"status": Database["public"]['Enums']["project_status"],"time_zone": string,"type": Database["public"]['Enums']["project_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_guests"?: boolean,"created_at"?: string,"description"?: string | null,"end_date": string,"host_id": string,"id"?: string,"max_session_minutes"?: number | null,"members_can_invite"?: boolean,"min_participants"?: number,"min_session_minutes"?: number | null,"name": string,"planning_mode"?: Database["public"]['Enums']["planning_mode"],"preferred_session_minutes"?: number | null,"show_individual_availability"?: boolean,"slot_minutes"?: number,"start_date": string,"status"?: Database["public"]['Enums']["project_status"],"time_zone"?: string,"type"?: Database["public"]['Enums']["project_type"],"updated_at"?: string
                  }
                  Update: {
                    "allow_guests"?: boolean,"created_at"?: string,"description"?: string | null,"end_date"?: string,"host_id"?: string,"id"?: string,"max_session_minutes"?: number | null,"members_can_invite"?: boolean,"min_participants"?: number,"min_session_minutes"?: number | null,"name"?: string,"planning_mode"?: Database["public"]['Enums']["planning_mode"],"preferred_session_minutes"?: number | null,"show_individual_availability"?: boolean,"slot_minutes"?: number,"start_date"?: string,"status"?: Database["public"]['Enums']["project_status"],"time_zone"?: string,"type"?: Database["public"]['Enums']["project_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"session_participants": {
                  Row: {
                    "member_id": string,"project_id": string,"responded_at": string | null,"response": Database["public"]['Enums']["session_response"],"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member_id": string,"project_id": string,"responded_at"?: string | null,"response"?: Database["public"]['Enums']["session_response"],"session_id": string
                  }
                  Update: {
                    "member_id"?: string,"project_id"?: string,"responded_at"?: string | null,"response"?: Database["public"]['Enums']["session_response"],"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_participants_member_id_project_id_fkey"
      columns: ["member_id","project_id"]
isOneToOne: false
      referencedRelation: "project_members"
      referencedColumns: ["id","project_id"]
    },{
      foreignKeyName: "session_participants_session_id_project_id_fkey"
      columns: ["session_id","project_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id","project_id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"ends_at": string,"id": string,"project_id": string,"starts_at": string,"status": Database["public"]['Enums']["session_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description"?: string | null,"ends_at": string,"id"?: string,"project_id": string,"starts_at": string,"status"?: Database["public"]['Enums']["session_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"ends_at"?: string,"id"?: string,"project_id"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "availability_kind": "available"|"unavailable","entry_source": "manual"|"exception","member_role": "host"|"participant","planning_mode": "weekly"|"multi_week","project_status": "active"|"closed"|"archived","project_type": "project"|"event"|"meeting"|"work_session"|"activity"|"other","session_response": "pending"|"accepted"|"declined","session_status": "proposed"|"confirmed"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "availability_kind": ["available", "unavailable"],"entry_source": ["manual", "exception"],"member_role": ["host", "participant"],"planning_mode": ["weekly", "multi_week"],"project_status": ["active", "closed", "archived"],"project_type": ["project", "event", "meeting", "work_session", "activity", "other"],"session_response": ["pending", "accepted", "declined"],"session_status": ["proposed", "confirmed", "cancelled"]
          }
        }
} as const

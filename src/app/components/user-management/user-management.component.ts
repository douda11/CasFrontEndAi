import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AdminService } from '../../services/admin.service';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'ADMIN' | 'COMMERCIAL' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  telephone?: string;
  departement?: string;
  hubspot_user_id?: string;
  hubspot_portal_id?: string;
  is_hubspot_user?: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserCreate {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'COMMERCIAL' | 'VIEWER';
  telephone?: string;
  departement?: string;
}

export interface UserList {
  users: User[];
  total: number;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  COMMERCIAL = 'COMMERCIAL',
  VIEWER = 'VIEWER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  totalUsers = 0;
  currentPage = 1;
  perPage = 10;
  loading = false;

  // Filters
  searchTerm = '';
  selectedRole: string | null = null;
  selectedStatus: string | null = null;

  // Dialog
  showUserDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  currentUser: any = {};

  // Options
  roleOptions = [
    { 
      label: 'Administrateur', 
      value: UserRole.ADMIN,
      description: 'Accès complet au système'
    },
    { 
      label: 'Commercial', 
      value: UserRole.COMMERCIAL,
      description: 'Gestion des clients et devis'
    },
    { 
      label: 'Observateur', 
      value: UserRole.VIEWER,
      description: 'Consultation uniquement'
    }
  ];

  statusOptions = [
    { label: 'Actif', value: UserStatus.ACTIVE },
    { label: 'Inactif', value: UserStatus.INACTIVE },
    { label: 'Suspendu', value: UserStatus.SUSPENDED }
  ];

  constructor(
    private adminService: AdminService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    console.log('🔍 Loading users with params:', {
      page: this.currentPage,
      perPage: this.perPage,
      searchTerm: this.searchTerm,
      selectedRole: this.selectedRole,
      selectedStatus: this.selectedStatus
    });
    
    this.adminService.getUsers(
      this.currentPage,
      this.perPage,
      this.searchTerm || undefined,
      this.selectedRole || undefined,
      this.selectedStatus || undefined
    ).subscribe({
      next: (response) => {
        console.log('✅ Users loaded successfully:', response);
        // Le backend retourne directement un tableau, pas un objet UserList
        if (Array.isArray(response)) {
          this.users = response;
          this.totalUsers = response.length;
        } else {
          this.users = response.users || [];
          this.totalUsers = response.total || 0;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des utilisateurs'
        });
        this.loading = false;
      }
    });
  }

  loadUsersLazy(event: any) {
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.perPage = event.rows;
    this.loadUsers();
  }

  onSearch() {
    console.log('🔍 onSearch triggered with searchTerm:', this.searchTerm);
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange() {
    console.log('🔍 onFilterChange triggered - Role:', this.selectedRole, 'Status:', this.selectedStatus);
    this.currentPage = 1;
    this.loadUsers();
  }

  openCreateDialog() {
    this.dialogMode = 'create';
    this.currentUser = {
      prenom: '',
      nom: '',
      email: '',
      password: '',
      role: UserRole.COMMERCIAL
    };
    this.showUserDialog = true;
  }

  editUser(user: User) {
    this.dialogMode = 'edit';
    this.currentUser = { ...user };
    this.showUserDialog = true;
  }

  hideUserDialog() {
    this.showUserDialog = false;
    this.currentUser = {};
  }

  saveUser() {
    if (this.dialogMode === 'create') {
      this.adminService.createUser(this.currentUser as UserCreate).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Utilisateur créé avec succès'
          });
          this.hideUserDialog();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.error?.detail || 'Erreur lors de la création'
          });
        }
      });
    } else {
      this.adminService.updateUser(this.currentUser.id, this.currentUser).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Utilisateur modifié avec succès'
          });
          this.hideUserDialog();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.error?.detail || 'Erreur lors de la modification'
          });
        }
      });
    }
  }

  activateUser(user: User) {
    this.adminService.activateUser(user.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Utilisateur activé'
        });
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error activating user:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'activation'
        });
      }
    });
  }

  deactivateUser(user: User) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir désactiver ${user.prenom} ${user.nom} ?`,
      header: 'Confirmer la désactivation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.adminService.deactivateUser(user.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Utilisateur désactivé'
            });
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error deactivating user:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la désactivation'
            });
          }
        });
      }
    });
  }

  deleteUser(user: User) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${user.prenom} ${user.nom} ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Utilisateur supprimé'
            });
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: error.error?.detail || 'Erreur lors de la suppression'
            });
          }
        });
      }
    });
  }

  getRoleLabel(role: UserRole): string {
    const roleMap = {
      [UserRole.ADMIN]: 'Admin',
      [UserRole.COMMERCIAL]: 'Commercial',
      [UserRole.VIEWER]: 'Viewer'
    };
    return roleMap[role] || role;
  }

  getRoleSeverity(role: UserRole): string {
    const severityMap = {
      [UserRole.ADMIN]: 'danger',
      [UserRole.COMMERCIAL]: 'success',
      [UserRole.VIEWER]: 'info'
    };
    return severityMap[role] || 'info';
  }

  getStatusLabel(status: UserStatus): string {
    const statusMap = {
      [UserStatus.ACTIVE]: 'Actif',
      [UserStatus.INACTIVE]: 'Inactif',
      [UserStatus.SUSPENDED]: 'Suspendu'
    };
    return statusMap[status] || status;
  }

  getStatusSeverity(status: UserStatus): string {
    const severityMap = {
      [UserStatus.ACTIVE]: 'success',
      [UserStatus.INACTIVE]: 'warning',
      [UserStatus.SUSPENDED]: 'danger'
    };
    return severityMap[status] || 'info';
  }
}

import type { APIRoute } from 'astro';
import { budgetService } from '../../../lib/services/budget.service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;

    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.fundClusterId || !data.year || !data.reference || !data.description || !data.amount) {
      return new Response(
        JSON.stringify({ message: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create appropriation
    const result = await budgetService.createAppropriation({
      fundClusterId: data.fundClusterId,
      year: data.year,
      amount: data.amount,
      description: data.description,
      reference: data.reference
    });

    return new Response(
      JSON.stringify({
        message: 'Appropriation created successfully',
        id: result.insertId
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating appropriation:', error);
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
